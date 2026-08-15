"""Business logic and transaction boundaries for the safety module (FR-SAF-*).

Services own the transaction and may query their own module's models. A
service may import another module's model classes for read-only joins — this
module leans on that for `Household`/`Member` (registry), `Area` (geo), and
`User` (users) — but never calls another module's business logic directly
(AGENTS.md Section 5, reworded alongside this module to match what
`registry/service.py` and `evacuation/service.py` already did).

`EmergencyEvent` itself is never queried here — every function takes the
already-resolved event object from `evacuation.service` (`get_active_event`/
`require_active_event`), which owns the model and its lifecycle
(FR-SAF-018/019).
"""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.deps import AuthenticatedUser, apply_area_scope
from src.core.errors import ConflictError, NotFoundError, PermissionDeniedError
from src.core.pagination import Page, page_meta
from src.core.uploads import save_upload
from src.domain.triage import triage_priority
from src.modules.evacuation import service as evacuation_service
from src.modules.evacuation.models import EmergencyEvent, EvacCenter, EvacCheckin
from src.modules.evacuation.schemas import EvacCheckinCreate, PublicEmergencyEvent
from src.modules.geo.models import Area, Facility  # join-only (AGENTS.md Section 5)
from src.modules.geo.service import point_to_geojson
from src.modules.registry import service as registry_service
from src.modules.registry.models import Household, Member  # join-only
from src.modules.safety.models import (
    IncidentReport,
    RescueRequest,
    SafetyStatus,
    UnregisteredPerson,
)
from src.modules.safety.schemas import (
    AccountedForOut,
    AreaAccountedFor,
    EmergencyWorkspaceOut,
    HouseholdSafetyOut,
    IncidentReportIn,
    IncidentReportOut,
    IncidentReportReview,
    MemberSafetyOut,
    MySafetyOut,
    PersonSafetyJourneyOut,
    PersonTimelineEntry,
    RescueRequestAck,
    RescueRequestOut,
    RescueRequestPatch,
    RescueRequestPublicIn,
    SafetyCheckinLogItem,
    SafetyLedgerPageOut,
    SafetyStatusAdminIn,
    SafetyStatusSelfIn,
    UnregisteredPersonIn,
    UnregisteredPersonOut,
    UnregisteredPersonPatch,
    WorkspaceHouseholdOut,
    WorkspaceMemberOut,
    WorkspaceUnregisteredOut,
)

# pending -> verified -> dispatched -> resolved; any state -> dismissed.
RESCUE_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"verified", "dismissed"},
    "verified": {"dispatched", "dismissed"},
    "dispatched": {"resolved", "dismissed"},
    "resolved": set(),
    "dismissed": set(),
}

_NON_DIGITS_RE = re.compile(r"\D")

VULNERABILITY_FLAGS = (
    "is_infant",
    "is_child",
    "is_senior",
    "is_pwd",
    "is_pregnant",
    "is_lactating",
    "has_chronic_condition",
    "is_bedridden",
)


def _member_flags(member: Member) -> list[str]:
    flags: list[str] = []
    if getattr(member, "birth_date", None) is not None:
        today = datetime.now(UTC).date()
        birth = member.birth_date
        had_birthday = (today.month, today.day) >= (birth.month, birth.day)
        age = today.year - birth.year - (0 if had_birthday else 1)
        if 0 <= age <= 4:
            flags.append("is_infant")
        elif age < 18:
            flags.append("is_child")
    elif getattr(member, "is_child", False):
        flags.append("is_child")

    if getattr(member, "is_senior", False):
        flags.append("is_senior")
    if getattr(member, "is_pwd", False):
        flags.append("is_pwd")
    if getattr(member, "is_pregnant", False):
        flags.append("is_pregnant")
    if getattr(member, "is_lactating", False):
        flags.append("is_lactating")
    if getattr(member, "has_chronic_condition", False):
        flags.append("has_chronic_condition")
    if getattr(member, "is_bedridden", False):
        flags.append("is_bedridden")
    return flags


def _event_out(event: EmergencyEvent) -> PublicEmergencyEvent:
    return PublicEmergencyEvent(
        id=event.id, name=event.name, type=event.type, started_at=event.started_at
    )


async def _assign_member_centers(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    member_ids: list[uuid.UUID],
    evac_center_id: uuid.UUID | None,
    actor: AuthenticatedUser,
    checked_in_at: datetime | None = None,
) -> None:
    if evac_center_id is None or not member_ids:
        return
    members = (
        await session.execute(select(Member.id, Member.full_name).where(Member.id.in_(member_ids)))
    ).all()
    for member_id, full_name in members:
        await evacuation_service.create_checkin(
            session,
            EvacCheckinCreate(
                evac_center_id=evac_center_id,
                event_id=event.id,
                member_id=member_id,
                person_name=full_name,
                checked_in_at=checked_in_at,
            ),
            actor=actor,
            commit=False,
        )


async def _assign_unregistered_center(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    person: UnregisteredPerson,
    evac_center_id: uuid.UUID | None,
    actor: AuthenticatedUser,
    checked_in_at: datetime | None = None,
) -> None:
    if evac_center_id is None:
        return
    await evacuation_service.create_checkin(
        session,
        EvacCheckinCreate(
            evac_center_id=evac_center_id,
            event_id=event.id,
            unregistered_person_id=person.id,
            person_name=person.full_name,
            checked_in_at=checked_in_at,
        ),
        actor=actor,
        commit=False,
    )


async def _user_names(session: AsyncSession, user_ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
    if not user_ids:
        return {}
    from src.modules.users.models import User  # join-only, same precedent as evacuation.event_out

    rows = (
        await session.execute(select(User.id, User.full_name).where(User.id.in_(user_ids)))
    ).all()
    return dict(rows)


async def _supersede_current(
    session: AsyncSession,
    *,
    event_id: uuid.UUID,
    member_id: uuid.UUID | None = None,
    unregistered_person_id: uuid.UUID | None = None,
) -> None:
    """The append-only enforcer. Always call this, then `flush()`, before
    inserting a new row for the same subject — with `uq_safety_current_member`
    / `uq_safety_current_unreg` in place, skipping the flush turns into a hard
    `UniqueViolation` rather than a silent double-count."""
    stmt = update(SafetyStatus).where(
        SafetyStatus.event_id == event_id, SafetyStatus.superseded_at.is_(None)
    )
    stmt = (
        stmt.where(SafetyStatus.member_id == member_id)
        if member_id is not None
        else stmt.where(SafetyStatus.unregistered_person_id == unregistered_person_id)
    )
    await session.execute(stmt.values(superseded_at=datetime.now(UTC)))
    await session.flush()


def _resolve_set_method(
    *, tier: Literal["me", "admin"], scope: Literal["member", "household", "unregistered"]
) -> str:
    """The *only* source of `set_method` — never accept it from the client.
    A resident posting `set_method="assisted"` would otherwise be able to
    forge barangay confirmation, destroying FR-SAF-005's confidence
    distinction outright."""
    if scope == "household":
        return "household_bulk"
    return "self" if tier == "me" else "assisted"


async def _write_one_status(
    session: AsyncSession,
    *,
    event_id: uuid.UUID,
    status: str,
    actor: AuthenticatedUser,
    set_method: str,
    ip: str | None,
    member_id: uuid.UUID | None = None,
    unregistered_person_id: uuid.UUID | None = None,
    set_at: datetime | None = None,
) -> SafetyStatus:
    await _supersede_current(
        session,
        event_id=event_id,
        member_id=member_id,
        unregistered_person_id=unregistered_person_id,
    )
    row = SafetyStatus(
        event_id=event_id,
        member_id=member_id,
        unregistered_person_id=unregistered_person_id,
        status=status,
        set_by_user_id=actor.id,
        set_method=set_method,
        set_at=set_at or datetime.now(UTC),
    )
    session.add(row)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="safety_status.set",
        entity_type="safety_status",
        entity_id=row.id,
        changes={
            "member_id": str(member_id) if member_id else None,
            "unregistered_person_id": (
                str(unregistered_person_id) if unregistered_person_id else None
            ),
            "status": status,
            "set_method": set_method,
        },
        ip=ip,
    )
    return row


async def current_status_map(
    session: AsyncSession, *, event_id: uuid.UUID, member_ids: list[uuid.UUID]
) -> dict[uuid.UUID, SafetyStatus]:
    if not member_ids:
        return {}
    rows = (
        (
            await session.execute(
                select(SafetyStatus).where(
                    SafetyStatus.event_id == event_id,
                    SafetyStatus.member_id.in_(member_ids),
                    SafetyStatus.superseded_at.is_(None),
                )
            )
        )
        .scalars()
        .all()
    )
    return {row.member_id: row for row in rows}


async def get_household_safety(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    household_id: uuid.UUID,
    user: AuthenticatedUser | None = None,
) -> HouseholdSafetyOut:
    household = await registry_service.get_household_or_404(session, household_id)
    if user is not None and user.is_area_scoped and household.area_id not in user.assigned_area_ids:
        raise PermissionDeniedError("This household is outside your assigned area.")
    members = (
        (
            await session.execute(
                select(Member)
                .where(Member.household_id == household_id, Member.deleted_at.is_(None))
                .order_by(Member.is_head.desc(), Member.full_name)
            )
        )
        .scalars()
        .all()
    )
    status_map = await current_status_map(
        session, event_id=event.id, member_ids=[m.id for m in members]
    )
    setter_ids = {s.set_by_user_id for s in status_map.values() if s.set_by_user_id}
    setter_names = await _user_names(session, setter_ids)

    out_members = [
        MemberSafetyOut(
            member_id=member.id,
            full_name=member.full_name,
            is_head=member.is_head,
            status=(status_map[member.id].status if member.id in status_map else "unaccounted"),
            set_method=(status_map[member.id].set_method if member.id in status_map else None),
            set_at=(status_map[member.id].set_at if member.id in status_map else None),
            set_by_name=(
                setter_names.get(status_map[member.id].set_by_user_id)
                if member.id in status_map and status_map[member.id].set_by_user_id
                else None
            ),
            vulnerability_flags=_member_flags(member),
        )
        for member in members
    ]
    return HouseholdSafetyOut(
        event=_event_out(event),
        household_id=household.id,
        reference_no=household.reference_no,
        members=out_members,
    )


async def get_my_safety(
    session: AsyncSession,
    *,
    user: AuthenticatedUser,
    event_id: uuid.UUID | None = None,
) -> MySafetyOut:
    from src.modules.evacuation import service as evacuation_service

    active_events = await evacuation_service.list_active_events(session)
    if not active_events:
        return MySafetyOut(event=None, household=None)
    event = await evacuation_service.require_active_event(session, event_id)

    household = await registry_service.household_for_user_id(session, user.id)
    if household is None:
        return MySafetyOut(event=_event_out(event), household=None)

    household_safety = await get_household_safety(session, event=event, household_id=household.id)
    return MySafetyOut(event=household_safety.event, household=household_safety)


async def _household_flags(session: AsyncSession, household_id: uuid.UUID) -> set[str]:
    members = (
        (
            await session.execute(
                select(Member).where(
                    Member.household_id == household_id, Member.deleted_at.is_(None)
                )
            )
        )
        .scalars()
        .all()
    )
    flags: set[str] = set()
    for member in members:
        flags.update(_member_flags(member))
    return flags


async def _sync_household_rescue(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    household_id: uuid.UUID,
    member_ids_needing_rescue: list[uuid.UUID],
    actor: AuthenticatedUser,
    ip: str | None,
) -> None:
    """When members are flagged as needing rescue, ensure an active RescueRequest
    exists for this household and emergency event in the rescue queue with computed priority."""
    if not member_ids_needing_rescue:
        return
    household = await registry_service.get_household_or_404(session, household_id)
    members = (
        (
            await session.execute(
                select(Member).where(
                    Member.id.in_(member_ids_needing_rescue), Member.deleted_at.is_(None)
                )
            )
        )
        .scalars()
        .all()
    )
    member_names = [m.full_name for m in members]

    existing = (
        (
            await session.execute(
                select(RescueRequest).where(
                    RescueRequest.event_id == event.id,
                    RescueRequest.household_id == household_id,
                    RescueRequest.status.in_(("pending", "verified", "dispatched")),
                )
            )
        )
        .scalars()
        .first()
    )

    flags = await _household_flags(session, household_id)
    people_count = len(member_ids_needing_rescue)
    priority, _ = triage_priority(flags=flags, people_count=people_count)

    names_summary = ", ".join(member_names) if member_names else f"{people_count} member(s)"
    desc = (
        f"Rescue flagged for household {household.reference_no} "
        f"({names_summary}) via emergency response map."
    )

    if existing:
        existing.people_count = people_count
        existing.description = desc
        if not existing.priority_is_manual:
            existing.priority = priority
        await write_audit(
            session,
            actor_user_id=actor.id,
            action="rescue_request.update",
            entity_type="rescue_request",
            entity_id=existing.id,
            changes={
                "people_count": people_count,
                "description": desc,
                "priority": existing.priority,
            },
            ip=ip,
        )
    else:
        req = RescueRequest(
            event_id=event.id,
            household_id=household_id,
            requester_name=household.head_name or "Household Head",
            contact_number=household.contact_number,
            location=household.location,
            location_note=household.street_address,
            description=desc,
            people_count=people_count,
            status="pending",
            priority=priority,
            priority_is_manual=False,
            source_ip=ip,
        )
        session.add(req)
        await session.flush()
        await write_audit(
            session,
            actor_user_id=actor.id,
            action="rescue_request.create",
            entity_type="rescue_request",
            entity_id=req.id,
            changes={
                "household_id": str(household_id),
                "people_count": people_count,
                "priority": priority,
            },
            ip=ip,
        )


async def _resolve_household_rescue_if_all_safe(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    household_id: uuid.UUID,
    actor: AuthenticatedUser,
    ip: str | None,
) -> None:
    """When all members of a household are safe, resolve any open RescueRequest."""
    members = (
        (
            await session.execute(
                select(Member.id).where(
                    Member.household_id == household_id, Member.deleted_at.is_(None)
                )
            )
        )
        .scalars()
        .all()
    )
    if not members:
        return
    status_map = await current_status_map(session, event_id=event.id, member_ids=list(members))
    all_safe = len(status_map) == len(members) and all(
        s.status == "safe" for s in status_map.values()
    )
    if not all_safe:
        return

    open_rescues = (
        (
            await session.execute(
                select(RescueRequest).where(
                    RescueRequest.event_id == event.id,
                    RescueRequest.household_id == household_id,
                    RescueRequest.status.in_(("pending", "verified", "dispatched")),
                )
            )
        )
        .scalars()
        .all()
    )

    for req in open_rescues:
        req.status = "resolved"
        req.resolved_at = datetime.now(UTC)
        req.resolution_note = "Resolved: Household confirmed safe via emergency check-in."
        await write_audit(
            session,
            actor_user_id=actor.id,
            action="rescue_request.update",
            entity_type="rescue_request",
            entity_id=req.id,
            changes={"status": "resolved", "resolution_note": req.resolution_note},
            ip=ip,
        )


async def _sync_unregistered_rescue(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    person: UnregisteredPerson,
    status: str,
    actor: AuthenticatedUser,
    ip: str | None,
) -> None:
    """Sync rescue request state for unregistered person."""
    if status == "needs_rescue":
        existing = (
            (
                await session.execute(
                    select(RescueRequest).where(
                        RescueRequest.event_id == event.id,
                        RescueRequest.requester_name == person.full_name,
                        RescueRequest.household_id.is_(None),
                        RescueRequest.status.in_(("pending", "verified", "dispatched")),
                    )
                )
            )
            .scalars()
            .first()
        )

        flags: set[str] = set()
        for flag in VULNERABILITY_FLAGS:
            if getattr(person, flag, False):
                flags.add(flag)
        priority, _ = triage_priority(flags=flags, people_count=1)
        desc = (
            f"Rescue flagged for unregistered walk-in {person.full_name} "
            "via emergency workspace."
        )

        if not existing:
            req = RescueRequest(
                event_id=event.id,
                household_id=None,
                requester_name=person.full_name,
                contact_number=person.contact_number,
                location=person.location,
                location_note=person.location_note,
                description=desc,
                people_count=1,
                status="pending",
                priority=priority,
                priority_is_manual=False,
                source_ip=ip,
            )
            session.add(req)
            await session.flush()
            await write_audit(
                session,
                actor_user_id=actor.id,
                action="rescue_request.create",
                entity_type="rescue_request",
                entity_id=req.id,
                changes={"requester_name": person.full_name, "priority": priority},
                ip=ip,
            )
    elif status == "safe":
        open_rescues = (
            (
                await session.execute(
                    select(RescueRequest).where(
                        RescueRequest.event_id == event.id,
                        RescueRequest.requester_name == person.full_name,
                        RescueRequest.household_id.is_(None),
                        RescueRequest.status.in_(("pending", "verified", "dispatched")),
                    )
                )
            )
            .scalars()
            .all()
        )
        for req in open_rescues:
            req.status = "resolved"
            req.resolved_at = datetime.now(UTC)
            req.resolution_note = (
                "Resolved: Unregistered person confirmed safe via emergency check-in."
            )
            await write_audit(
                session,
                actor_user_id=actor.id,
                action="rescue_request.update",
                entity_type="rescue_request",
                entity_id=req.id,
                changes={"status": "resolved", "resolution_note": req.resolution_note},
                ip=ip,
            )


async def set_member_statuses(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    household_id: uuid.UUID,
    member_ids: list[uuid.UUID],
    status: str,
    actor: AuthenticatedUser,
    set_method: str,
    evac_center_id: uuid.UUID | None = None,
    ip: str | None = None,
    set_at: datetime | None = None,
) -> HouseholdSafetyOut:
    live_ids = set(
        (
            await session.execute(
                select(Member.id).where(
                    Member.household_id == household_id, Member.deleted_at.is_(None)
                )
            )
        ).scalars()
    )
    if not set(member_ids) <= live_ids:
        raise ConflictError("One or more selected members are not in this household.")
    for member_id in member_ids:
        await _write_one_status(
            session,
            event_id=event.id,
            member_id=member_id,
            status=status,
            actor=actor,
            set_method=set_method,
            ip=ip,
            set_at=set_at,
        )
    if status == "safe":
        await _assign_member_centers(
            session,
            event=event,
            member_ids=member_ids,
            evac_center_id=evac_center_id,
            actor=actor,
            checked_in_at=set_at,
        )
        await _resolve_household_rescue_if_all_safe(
            session,
            event=event,
            household_id=household_id,
            actor=actor,
            ip=ip,
        )
    elif status == "needs_rescue":
        await _sync_household_rescue(
            session,
            event=event,
            household_id=household_id,
            member_ids_needing_rescue=member_ids,
            actor=actor,
            ip=ip,
        )
    await session.commit()
    return await get_household_safety(session, event=event, household_id=household_id)


async def set_household_status(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    household_id: uuid.UUID,
    status: str,
    actor: AuthenticatedUser,
    set_method: str,
    acknowledged_member_ids: list[uuid.UUID],
    evac_center_id: uuid.UUID | None = None,
    ip: str | None = None,
    set_at: datetime | None = None,
) -> HouseholdSafetyOut:
    """FR-SAF-003, enforced server-side: `acknowledged_member_ids` must equal
    the household's live roster exactly. BR-5.1b's whole argument is that an
    over-reported "safe" removes someone from the search list — a client-only
    confirm dialog is not enough to guarantee that."""
    live_ids = set(
        (
            await session.execute(
                select(Member.id).where(
                    Member.household_id == household_id, Member.deleted_at.is_(None)
                )
            )
        )
        .scalars()
        .all()
    )
    if set(acknowledged_member_ids) != live_ids:
        raise ConflictError(
            "The household's members have changed since this list was shown. "
            "Review and confirm again."
        )
    for member_id in live_ids:
        await _write_one_status(
            session,
            event_id=event.id,
            member_id=member_id,
            status=status,
            actor=actor,
            set_method=set_method,
            ip=ip,
            set_at=set_at,
        )
    if status == "safe":
        await _assign_member_centers(
            session,
            event=event,
            member_ids=list(live_ids),
            evac_center_id=evac_center_id,
            actor=actor,
            checked_in_at=set_at,
        )
        await _resolve_household_rescue_if_all_safe(
            session,
            event=event,
            household_id=household_id,
            actor=actor,
            ip=ip,
        )
    elif status == "needs_rescue":
        await _sync_household_rescue(
            session,
            event=event,
            household_id=household_id,
            member_ids_needing_rescue=list(live_ids),
            actor=actor,
            ip=ip,
        )
    await session.commit()
    return await get_household_safety(session, event=event, household_id=household_id)


async def set_unregistered_status(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    unregistered_person_id: uuid.UUID,
    status: str,
    actor: AuthenticatedUser,
    set_method: str,
    evac_center_id: uuid.UUID | None = None,
    ip: str | None,
    set_at: datetime | None = None,
) -> SafetyStatus:
    person = await get_unregistered_or_404(session, unregistered_person_id)
    if person.event_id != event.id:
        raise ConflictError("This unregistered person belongs to a different emergency event.")
    if person.converted_member_id is not None:
        raise ConflictError("This person has already been converted to an official member.")
    row = await _write_one_status(
        session,
        event_id=event.id,
        unregistered_person_id=unregistered_person_id,
        status=status,
        actor=actor,
        set_method=set_method,
        ip=ip,
        set_at=set_at,
    )
    if status == "safe":
        await _assign_unregistered_center(
            session,
            event=event,
            person=person,
            evac_center_id=evac_center_id,
            actor=actor,
            checked_in_at=set_at,
        )
    await _sync_unregistered_rescue(
        session,
        event=event,
        person=person,
        status=status,
        actor=actor,
        ip=ip,
    )
    await session.commit()
    return row


async def submit_self_status(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    user: AuthenticatedUser,
    body: SafetyStatusSelfIn,
    ip: str | None,
) -> HouseholdSafetyOut:
    household = await registry_service.household_for_user_id(session, user.id)
    if household is None:
        raise NotFoundError("Complete onboarding before checking in your household.")

    set_method = _resolve_set_method(tier="me", scope=body.scope)
    if body.scope == "household":
        return await set_household_status(
            session,
            event=event,
            household_id=household.id,
            status=body.status,
            actor=user,
            set_method=set_method,
            acknowledged_member_ids=body.acknowledged_member_ids,
            evac_center_id=body.evac_center_id,
            ip=ip,
        )

    live_ids = set(
        (
            await session.execute(
                select(Member.id).where(
                    Member.household_id == household.id, Member.deleted_at.is_(None)
                )
            )
        )
        .scalars()
        .all()
    )
    if not set(body.member_ids) <= live_ids:
        raise PermissionDeniedError("One or more members do not belong to your household.")
    return await set_member_statuses(
        session,
        event=event,
        household_id=household.id,
        member_ids=body.member_ids,
        status=body.status,
        actor=user,
        set_method=set_method,
        evac_center_id=body.evac_center_id,
        ip=ip,
    )


async def submit_admin_status(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    actor: AuthenticatedUser,
    body: SafetyStatusAdminIn,
    ip: str | None,
) -> HouseholdSafetyOut | None:
    set_method = _resolve_set_method(tier="admin", scope=body.scope)

    if body.scope == "unregistered":
        await set_unregistered_status(
            session,
            event=event,
            unregistered_person_id=body.unregistered_person_id,
            status=body.status,
            actor=actor,
            set_method=set_method,
            evac_center_id=body.evac_center_id,
            ip=ip,
            set_at=body.set_at,
        )
        return None

    household_id = body.household_id
    if household_id is None:
        raise PermissionDeniedError("household_id is required for this scope.")
    household_stmt = select(Household.id).where(
        Household.id == household_id, Household.deleted_at.is_(None)
    )
    household_stmt = apply_area_scope(household_stmt, actor, Household.area_id)
    if await session.scalar(household_stmt) is None:
        raise PermissionDeniedError("This household is outside your assigned area.")

    if body.scope == "household":
        return await set_household_status(
            session,
            event=event,
            household_id=household_id,
            status=body.status,
            actor=actor,
            set_method=set_method,
            acknowledged_member_ids=body.acknowledged_member_ids,
            evac_center_id=body.evac_center_id,
            ip=ip,
            set_at=body.set_at,
        )
    return await set_member_statuses(
        session,
        event=event,
        household_id=household_id,
        member_ids=body.member_ids,
        status=body.status,
        actor=actor,
        set_method=set_method,
        evac_center_id=body.evac_center_id,
        ip=ip,
        set_at=body.set_at,
    )


async def accounted_for_summary(
    session: AsyncSession, *, event: EmergencyEvent, user: AuthenticatedUser
) -> AccountedForOut:
    stmt = (
        select(Member.id, Household.area_id, Area.name)
        .join(Household, Member.household_id == Household.id)
        .join(Area, Household.area_id == Area.id)
        .where(Member.deleted_at.is_(None), Household.deleted_at.is_(None))
    )
    stmt = apply_area_scope(stmt, user, Household.area_id)
    rows = (await session.execute(stmt)).all()

    member_area: dict[uuid.UUID, tuple[uuid.UUID, str]] = {
        member_id: (area_id, area_name) for member_id, area_id, area_name in rows
    }
    status_map = await current_status_map(
        session, event_id=event.id, member_ids=list(member_area.keys())
    )

    buckets: dict[uuid.UUID, dict[str, object]] = {}
    for member_id, (area_id, area_name) in member_area.items():
        bucket = buckets.setdefault(
            area_id,
            {
                "area_name": area_name,
                "registered_members": 0,
                "safe_confirmed": 0,
                "safe_bulk": 0,
                "needs_rescue": 0,
            },
        )
        bucket["registered_members"] += 1
        current = status_map.get(member_id)
        if current is None:
            continue
        if current.status == "safe" and current.set_method == "household_bulk":
            bucket["safe_bulk"] += 1
        elif current.status == "safe":
            bucket["safe_confirmed"] += 1
        elif current.status == "needs_rescue":
            bucket["needs_rescue"] += 1
        # An explicit "unaccounted" row (a correction reverting someone from
        # "safe") falls through — it's counted as unaccounted below, exactly
        # like a member with no row at all.

    registered: list[AreaAccountedFor] = []
    total = AreaAccountedFor(
        area_id=None,
        area_name="All areas",
        registered_members=0,
        safe_confirmed=0,
        safe_bulk=0,
        needs_rescue=0,
        unaccounted=0,
    )
    for area_id, bucket in buckets.items():
        unaccounted = (
            bucket["registered_members"]
            - bucket["safe_confirmed"]
            - bucket["safe_bulk"]
            - bucket["needs_rescue"]
        )
        area_out = AreaAccountedFor(
            area_id=area_id,
            area_name=bucket["area_name"],
            registered_members=bucket["registered_members"],
            safe_confirmed=bucket["safe_confirmed"],
            safe_bulk=bucket["safe_bulk"],
            needs_rescue=bucket["needs_rescue"],
            unaccounted=unaccounted,
        )
        registered.append(area_out)
        total.registered_members += area_out.registered_members
        total.safe_confirmed += area_out.safe_confirmed
        total.safe_bulk += area_out.safe_bulk
        total.needs_rescue += area_out.needs_rescue
        total.unaccounted += area_out.unaccounted
    registered.sort(key=lambda a: a.area_name)

    unreg_statuses = (
        (
            await session.execute(
                select(SafetyStatus.status).where(
                    SafetyStatus.event_id == event.id,
                    SafetyStatus.unregistered_person_id.is_not(None),
                    SafetyStatus.superseded_at.is_(None),
                    SafetyStatus.unregistered_person_id.in_(
                        select(UnregisteredPerson.id).where(
                            UnregisteredPerson.converted_member_id.is_(None)
                        )
                    ),
                )
            )
        )
        .scalars()
        .all()
    )

    return AccountedForOut(
        event=_event_out(event),
        computed_at=datetime.now(UTC),
        registered=registered,
        registered_total=total,
        unregistered_safe=sum(1 for s in unreg_statuses if s == "safe"),
        unregistered_needs_rescue=sum(1 for s in unreg_statuses if s == "needs_rescue"),
    )


async def emergency_workspace(
    session: AsyncSession, *, event: EmergencyEvent, user: AuthenticatedUser
) -> EmergencyWorkspaceOut:
    """PII-bearing event workspace. The router excludes SK; BHW scope is applied here."""
    household_stmt = (
        select(Household, Area.name, func.ST_AsGeoJSON(Household.location))
        .join(Area, Household.area_id == Area.id)
        .where(Household.deleted_at.is_(None))
        .order_by(Area.name, Household.reference_no)
    )
    household_stmt = apply_area_scope(household_stmt, user, Household.area_id)
    household_rows = (await session.execute(household_stmt)).all()
    household_ids = [household.id for household, _area_name, _location in household_rows]

    members = []
    if household_ids:
        members = list(
            (
                await session.execute(
                    select(Member)
                    .where(Member.household_id.in_(household_ids), Member.deleted_at.is_(None))
                    .order_by(Member.is_head.desc(), Member.full_name)
                )
            ).scalars()
        )
    status_map = await current_status_map(
        session, event_id=event.id, member_ids=[member.id for member in members]
    )
    open_assignments: dict[uuid.UUID, tuple[uuid.UUID, str]] = {}
    if members:
        checkin_rows = (
            await session.execute(
                select(EvacCheckin.member_id, EvacCenter.id, Facility.name)
                .join(EvacCenter, EvacCheckin.evac_center_id == EvacCenter.id)
                .join(Facility, EvacCenter.facility_id == Facility.id)
                .where(
                    EvacCheckin.member_id.in_([member.id for member in members]),
                    EvacCheckin.checked_out_at.is_(None),
                )
            )
        ).all()
        open_assignments = {
            member_id: (center_id, center_name)
            for member_id, center_id, center_name in checkin_rows
        }

    members_by_household: dict[uuid.UUID, list[WorkspaceMemberOut]] = {
        household_id: [] for household_id in household_ids
    }
    for member in members:
        status_row = status_map.get(member.id)
        assignment = open_assignments.get(member.id)
        members_by_household[member.household_id].append(
            WorkspaceMemberOut(
                member_id=member.id,
                full_name=member.full_name,
                is_head=member.is_head,
                status=status_row.status if status_row else "unaccounted",
                set_method=status_row.set_method if status_row else None,
                vulnerability_flags=_member_flags(member),
                evac_center_id=assignment[0] if assignment else None,
                evac_center_name=assignment[1] if assignment else None,
            )
        )

    household_items: list[WorkspaceHouseholdOut] = []
    unmapped_count = 0
    for household, area_name, location_json in household_rows:
        roster = members_by_household[household.id]
        safe_count = sum(member.status == "safe" for member in roster)
        rescue_count = sum(member.status == "needs_rescue" for member in roster)
        unaccounted_count = len(roster) - safe_count - rescue_count
        location = point_to_geojson(location_json)
        if location is None:
            unmapped_count += 1
        household_items.append(
            WorkspaceHouseholdOut(
                household_id=household.id,
                reference_no=household.reference_no,
                head_name=household.head_name,
                area_id=household.area_id,
                area_name=area_name,
                street_address=household.street_address,
                location=location,
                waterway_proximity=household.waterway_proximity,
                members=roster,
                safe_count=safe_count,
                needs_rescue_count=rescue_count,
                unaccounted_count=unaccounted_count,
                all_safe=bool(roster) and safe_count == len(roster),
            )
        )

    unregistered_rows = list(
        (
            await session.execute(
                select(UnregisteredPerson).where(
                    UnregisteredPerson.event_id == event.id,
                    UnregisteredPerson.location.is_not(None),
                    UnregisteredPerson.converted_member_id.is_(None),
                )
            )
        ).scalars()
    )
    unreg_status_rows = (
        await session.execute(
            select(SafetyStatus).where(
                SafetyStatus.event_id == event.id,
                SafetyStatus.unregistered_person_id.in_([row.id for row in unregistered_rows]),
                SafetyStatus.superseded_at.is_(None),
            )
        )
    ).scalars()
    unreg_status_map = {row.unregistered_person_id: row for row in unreg_status_rows}
    unreg_assignments: dict[uuid.UUID, tuple[uuid.UUID, str]] = {}
    if unregistered_rows:
        rows = (
            await session.execute(
                select(EvacCheckin.unregistered_person_id, EvacCenter.id, Facility.name)
                .join(EvacCenter, EvacCheckin.evac_center_id == EvacCenter.id)
                .join(Facility, EvacCenter.facility_id == Facility.id)
                .where(
                    EvacCheckin.unregistered_person_id.in_([row.id for row in unregistered_rows]),
                    EvacCheckin.checked_out_at.is_(None),
                )
            )
        ).all()
        unreg_assignments = {
            person_id: (center_id, center_name) for person_id, center_id, center_name in rows
        }
    unregistered_pins = []
    for person in unregistered_rows:
        status_row = unreg_status_map.get(person.id)
        assignment = unreg_assignments.get(person.id)
        location = point_to_geojson(person.location)
        if location is None:
            continue
        unregistered_pins.append(
            WorkspaceUnregisteredOut(
                id=person.id,
                full_name=person.full_name,
                location=location,
                status=status_row.status if status_row else "unaccounted",
                status_set_at=status_row.set_at if status_row else None,
                vulnerability_flags=[flag for flag in VULNERABILITY_FLAGS if getattr(person, flag)],
                evac_center_id=assignment[0] if assignment else None,
                evac_center_name=assignment[1] if assignment else None,
            )
        )

    return EmergencyWorkspaceOut(
        event=_event_out(event),
        is_read_only=not event.is_active,
        households=household_items,
        unregistered_pins=unregistered_pins,
        unmapped_household_count=unmapped_count,
        evacuation_centers=await evacuation_service.list_evac_centers_admin(session),
    )


async def create_public_rescue_request(
    session: AsyncSession, *, body: RescueRequestPublicIn, source_ip: str | None
) -> RescueRequestAck:
    """FR-SAF-008/009 — the first unauthenticated write in this codebase.

    Per architecture.md's spec for this endpoint: no database read on the
    request path. `event_id` and `household_id` both stay NULL here —
    resolving either would mean a `SELECT`, and this path does not get to
    make one. `priority` also stays NULL; S3's triage computes it lazily on
    first read of the admin queue, not here. `status` takes the column's own
    `'pending'` default rather than being set explicitly, for the same
    reason — this function never reads the row back before returning.
    """
    location = (
        func.ST_SetSRID(func.ST_MakePoint(body.longitude, body.latitude), 4326)
        if body.latitude is not None and body.longitude is not None
        else None
    )
    row = RescueRequest(
        requester_name=body.requester_name,
        contact_number=body.contact_number,
        location=location,
        location_note=body.location_note,
        description=body.description,
        people_count=body.people_count,
        source_ip=source_ip,
    )
    session.add(row)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=None,  # null is sanctioned for system/anonymous actions
        action="rescue_request.create",
        entity_type="rescue_request",
        entity_id=row.id,
        ip=source_ip,
    )
    await session.commit()
    return RescueRequestAck(id=row.id, received_at=row.created_at)


async def get_unregistered_or_404(
    session: AsyncSession, unregistered_id: uuid.UUID
) -> UnregisteredPerson:
    """Exposed for registry's future FR-SAF-014 conversion flow (cut this
    pass) — registry would call this and `mark_converted`, never the reverse,
    per AGENTS.md Section 5."""
    person = await session.get(UnregisteredPerson, unregistered_id)
    if person is None:
        raise NotFoundError("Unregistered person record not found.")
    return person


async def finalize_unregistered_conversion(
    session: AsyncSession,
    *,
    unregistered_id: uuid.UUID,
    household_id: uuid.UUID,
    member_id: uuid.UUID,
    member_name: str,
    actor: AuthenticatedUser,
    ip: str | None = None,
) -> None:
    """Complete FR-SAF-014 inside the registry-owned conversion transaction."""
    person = await session.scalar(
        select(UnregisteredPerson).where(UnregisteredPerson.id == unregistered_id).with_for_update()
    )
    if person is None:
        raise NotFoundError("Unregistered person record not found.")
    if person.converted_member_id is not None:
        raise ConflictError("This unregistered person has already been converted.")

    current = await session.scalar(
        select(SafetyStatus).where(
            SafetyStatus.event_id == person.event_id,
            SafetyStatus.unregistered_person_id == person.id,
            SafetyStatus.superseded_at.is_(None),
        )
    )
    if current is not None:
        current.superseded_at = datetime.now(UTC)
        await session.flush()
        await _write_one_status(
            session,
            event_id=person.event_id,
            member_id=member_id,
            status=current.status,
            actor=actor,
            set_method="assisted",
            ip=ip,
        )

    await evacuation_service.transfer_unregistered_checkin(
        session,
        unregistered_person_id=person.id,
        member_id=member_id,
        person_name=member_name,
    )
    person.converted_household_id = household_id
    person.converted_member_id = member_id
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="unregistered_person.convert",
        entity_type="unregistered_person",
        entity_id=person.id,
        changes={"household_id": str(household_id), "member_id": str(member_id)},
        ip=ip,
    )
    await session.flush()


async def unregistered_out(
    session: AsyncSession, person: UnregisteredPerson
) -> UnregisteredPersonOut:
    status_row = (
        await session.execute(
            select(SafetyStatus)
            .where(SafetyStatus.unregistered_person_id == person.id)
            .order_by(
                SafetyStatus.superseded_at.is_(None).desc(),
                SafetyStatus.set_at.desc(),
            )
            .limit(1)
        )
    ).scalar_one_or_none()

    recorded_name = None
    if person.recorded_by_user_id is not None:
        names = await _user_names(session, {person.recorded_by_user_id})
        recorded_name = names.get(person.recorded_by_user_id)

    assignment = (
        await session.execute(
            select(EvacCheckin.evac_center_id, Facility.name)
            .join(EvacCenter, EvacCheckin.evac_center_id == EvacCenter.id)
            .join(Facility, EvacCenter.facility_id == Facility.id)
            .where(
                EvacCheckin.unregistered_person_id == person.id,
                EvacCheckin.checked_out_at.is_(None),
            )
        )
    ).one_or_none()

    return UnregisteredPersonOut(
        id=person.id,
        event_id=person.event_id,
        created_at=person.created_at,
        status_set_at=status_row.set_at if status_row else None,
        full_name=person.full_name,
        contact_number=person.contact_number,
        location=point_to_geojson(person.location),
        location_note=person.location_note,
        # Converted rows have no current temporary status, so expose their
        # last historical value while live totals continue to exclude them.
        status=status_row.status if status_row else "unaccounted",
        recorded_by_name=recorded_name,
        converted_household_id=person.converted_household_id,
        converted_member_id=person.converted_member_id,
        is_child=person.is_child,
        is_senior=person.is_senior,
        is_pwd=person.is_pwd,
        is_pregnant=person.is_pregnant,
        is_lactating=person.is_lactating,
        has_chronic_condition=person.has_chronic_condition,
        chronic_condition_note=person.chronic_condition_note,
        is_bedridden=person.is_bedridden,
        evac_center_id=assignment[0] if assignment else None,
        evac_center_name=assignment[1] if assignment else None,
    )


async def list_unregistered(
    session: AsyncSession,
    *,
    event_id: uuid.UUID | None = None,
    include_converted: bool = False,
    page: int = 1,
    size: int = 20,
) -> Page[UnregisteredPersonOut]:
    stmt = select(UnregisteredPerson).order_by(UnregisteredPerson.created_at.desc())
    if event_id is not None:
        stmt = stmt.where(UnregisteredPerson.event_id == event_id)
    if not include_converted:
        stmt = stmt.where(UnregisteredPerson.converted_member_id.is_(None))
    total = (await session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await session.execute(stmt.limit(size).offset((page - 1) * size))).scalars().all()
    items = [await unregistered_out(session, row) for row in rows]
    return Page[UnregisteredPersonOut](items=items, **page_meta(total, page, size))


async def create_unregistered(
    session: AsyncSession, *, body: UnregisteredPersonIn, actor: AuthenticatedUser, ip: str | None
) -> UnregisteredPersonOut:
    """Record the walk-in and initial event-scoped status in one transaction."""
    event = await evacuation_service.require_active_event(session, body.event_id)
    location = (
        func.ST_SetSRID(func.ST_MakePoint(body.longitude, body.latitude), 4326)
        if body.latitude is not None and body.longitude is not None
        else None
    )
    person = UnregisteredPerson(
        event_id=event.id,
        full_name=body.full_name,
        contact_number=body.contact_number,
        location=location,
        location_note=body.location_note,
        recorded_by_user_id=actor.id,
        is_child=body.is_child,
        is_senior=body.is_senior,
        is_pwd=body.is_pwd,
        is_pregnant=body.is_pregnant,
        is_lactating=body.is_lactating,
        has_chronic_condition=body.has_chronic_condition,
        chronic_condition_note=body.chronic_condition_note,
        is_bedridden=body.is_bedridden,
    )
    session.add(person)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="unregistered_person.create",
        entity_type="unregistered_person",
        entity_id=person.id,
        ip=ip,
    )
    # Commits internally (`_write_one_status` -> `set_unregistered_status`),
    # covering both inserts in one transaction.
    await set_unregistered_status(
        session,
        event=event,
        unregistered_person_id=person.id,
        status=body.initial_status,
        actor=actor,
        set_method="assisted",
        evac_center_id=body.evac_center_id,
        ip=ip,
        set_at=body.set_at,
    )
    return await unregistered_out(session, person)


async def update_unregistered(
    session: AsyncSession,
    unregistered_id: uuid.UUID,
    *,
    body: UnregisteredPersonPatch,
    actor: AuthenticatedUser,
    ip: str | None,
) -> UnregisteredPersonOut:
    person = await get_unregistered_or_404(session, unregistered_id)
    if body.full_name is not None:
        person.full_name = body.full_name
    if body.contact_number is not None:
        person.contact_number = body.contact_number
    if body.location_note is not None:
        person.location_note = body.location_note
    if body.latitude is not None and body.longitude is not None:
        person.location = func.ST_SetSRID(func.ST_MakePoint(body.longitude, body.latitude), 4326)
    for field in VULNERABILITY_FLAGS:
        value = getattr(body, field)
        if value is not None:
            setattr(person, field, value)
    if body.chronic_condition_note is not None:
        person.chronic_condition_note = body.chronic_condition_note

    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="unregistered_person.update",
        entity_type="unregistered_person",
        entity_id=person.id,
        ip=ip,
    )
    await session.commit()
    return await unregistered_out(session, person)


def _normalize_phone(value: str) -> str:
    """Digits only, then fold a `+63` country code to the equivalent local
    `0`-prefixed form so `+639171234567` and `09171234567` compare equal."""
    digits = _NON_DIGITS_RE.sub("", value)
    if digits.startswith("63") and len(digits) == 12:
        return "0" + digits[2:]
    return digits


async def _match_household(session: AsyncSession, contact_number: str | None) -> Household | None:
    """FR-SAF-010's triage input, exact normalised match on
    `household.contact_number` only — never fuzzy. `pg_trgm` similarity is
    right for spotting duplicate registrations at a desk; attaching the
    wrong household to a rescue request pulls in another family's
    vulnerability flags and reorders a queue during a flood.

    Compared in Python rather than SQL: at this scale (a few hundred
    households, run once per never-yet-triaged rescue request rather than
    on every read) a full scan of contact numbers is simpler and less
    error-prone than a SQL-side `+63`/`0` prefix normalisation.
    """
    if not contact_number:
        return None
    target = _normalize_phone(contact_number)
    if not target:
        return None
    rows = (
        (
            await session.execute(
                select(Household).where(
                    Household.deleted_at.is_(None), Household.contact_number.is_not(None)
                )
            )
        )
        .scalars()
        .all()
    )
    matches = [h for h in rows if _normalize_phone(h.contact_number) == target]
    return matches[0] if len(matches) == 1 else None


async def _ensure_triaged(session: AsyncSession, rows: list[RescueRequest]) -> None:
    """Lazy triage: `priority` is NULL on insert (S2's no-database-read
    rule on the public path) and computed here, the first time an admin
    reads the queue. A GET that writes is a compromise — architecture.md
    says triage happens asynchronously and there is no worker on the
    request path yet; the cleaner long-term home is a `services/cron` job,
    noted as a follow-up rather than built for zero demo value.
    """
    untriaged = [r for r in rows if r.priority is None]
    if not untriaged:
        return
    for row in untriaged:
        household = await _match_household(session, row.contact_number)
        flags: set[str] = set()
        if household is not None:
            row.household_id = household.id
            flags = await _household_flags(session, household.id)
        priority, _factors = triage_priority(flags=flags, people_count=row.people_count)
        row.priority = priority
        row.priority_is_manual = False
    await session.flush()
    await session.commit()


async def _rescue_request_out(session: AsyncSession, row: RescueRequest) -> RescueRequestOut:
    household = await session.get(Household, row.household_id) if row.household_id else None
    area_name = None
    if household is not None and household.area_id is not None:
        area = await session.get(Area, household.area_id)
        area_name = area.name if area else None

    # A manual override's number no longer matches what these factors would
    # explain, so don't show stale computed reasoning next to it.
    factors: list[str] = []
    if not row.priority_is_manual and row.household_id is not None:
        flags = await _household_flags(session, row.household_id)
        _priority, factors = triage_priority(flags=flags, people_count=row.people_count)

    assigned_name = None
    if row.assigned_to_user_id is not None:
        names = await _user_names(session, {row.assigned_to_user_id})
        assigned_name = names.get(row.assigned_to_user_id)

    return RescueRequestOut(
        id=row.id,
        created_at=row.created_at,
        requester_name=row.requester_name,
        contact_number=row.contact_number,
        location=point_to_geojson(row.location),
        location_note=row.location_note,
        description=row.description,
        people_count=row.people_count,
        status=row.status,
        priority=row.priority,
        priority_factors=factors,
        priority_is_manual=row.priority_is_manual,
        is_registered=row.household_id is not None,
        household_reference_no=household.reference_no if household else None,
        area_name=area_name,
        assigned_to_user_id=row.assigned_to_user_id,
        assigned_to_name=assigned_name,
        resolved_at=row.resolved_at,
        resolution_note=row.resolution_note,
    )


async def list_rescue_requests(
    session: AsyncSession, *, status: str | None = None, page: int = 1, size: int = 20
) -> Page[RescueRequestOut]:
    """**Not area-scoped, deliberately.** `rescue_request` has no `area_id`,
    and an anonymous request has no household to derive one from —
    `apply_area_scope` would hide from every BHW exactly the requests BR-5.9
    exists to protect. Gated on `admin, bhw` at the router; every caller
    sees every request.
    """

    def _base_stmt():
        stmt = select(RescueRequest)
        if status is not None:
            stmt = stmt.where(RescueRequest.status == status)
        return stmt

    # Triage anything still NULL across the *whole* filtered set before
    # ordering — sorting by `priority DESC` first would put a request that
    # has never been triaged dead last (NULLS LAST) until some other page
    # load happened to include it, which is the opposite of what a live
    # queue is for.
    untriaged = (
        (await session.execute(_base_stmt().where(RescueRequest.priority.is_(None))))
        .scalars()
        .all()
    )
    await _ensure_triaged(session, untriaged)

    stmt = _base_stmt().order_by(RescueRequest.priority.desc(), RescueRequest.created_at)
    total = (await session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await session.execute(stmt.limit(size).offset((page - 1) * size))).scalars().all()
    items = [await _rescue_request_out(session, row) for row in rows]
    return Page[RescueRequestOut](items=items, **page_meta(total, page, size))


async def get_rescue_request_or_404(session: AsyncSession, request_id: uuid.UUID) -> RescueRequest:
    row = await session.get(RescueRequest, request_id)
    if row is None:
        raise NotFoundError("Rescue request not found.")
    return row


async def update_rescue_request(
    session: AsyncSession,
    request_id: uuid.UUID,
    *,
    body: RescueRequestPatch,
    actor: AuthenticatedUser,
    ip: str | None,
) -> RescueRequestOut:
    row = await get_rescue_request_or_404(session, request_id)

    if body.status is not None and body.status != row.status:
        allowed = RESCUE_TRANSITIONS.get(row.status, set())
        if body.status not in allowed:
            raise ConflictError(
                f"Cannot move a rescue request from '{row.status}' to '{body.status}'."
            )
        row.status = body.status
        if body.status in ("resolved", "dismissed"):
            row.resolved_at = datetime.now(UTC)

    if body.assigned_to_user_id is not None:
        row.assigned_to_user_id = body.assigned_to_user_id
    if body.resolution_note is not None:
        row.resolution_note = body.resolution_note
    if body.priority is not None:
        row.priority = body.priority
        row.priority_is_manual = True

    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="rescue_request.update",
        entity_type="rescue_request",
        entity_id=row.id,
        changes={"status": row.status, "priority": row.priority},
        ip=ip,
    )
    await session.commit()
    return await _rescue_request_out(session, row)


async def open_rescue_count(session: AsyncSession) -> int:
    """For the admin dashboard tile (S6)."""
    stmt = (
        select(func.count())
        .select_from(RescueRequest)
        .where(RescueRequest.status.in_(("pending", "verified", "dispatched")))
    )
    return (await session.execute(stmt)).scalar_one()


async def _incident_report_out(session: AsyncSession, row: IncidentReport) -> IncidentReportOut:
    user_ids = {
        uid for uid in (row.reported_by_user_id, row.verified_by_user_id) if uid is not None
    }
    names = await _user_names(session, user_ids)
    return IncidentReportOut(
        id=row.id,
        created_at=row.created_at,
        type=row.type,
        description=row.description,
        location=point_to_geojson(row.location),
        location_note=row.location_note,
        photo_url=f"/uploads/{row.photo_path}" if row.photo_path else None,
        status=row.status,
        reported_by_name=(names.get(row.reported_by_user_id) if row.reported_by_user_id else None),
        verified_by_name=(names.get(row.verified_by_user_id) if row.verified_by_user_id else None),
        verified_at=row.verified_at,
        dismissal_reason=row.dismissal_reason,
    )


async def create_incident_report(
    session: AsyncSession,
    *,
    body: IncidentReportIn,
    photo: UploadFile | None,
    actor: AuthenticatedUser,
    ip: str | None,
) -> IncidentReportOut:
    """FR-SAF-015. Mounted on `/me` (authenticated), not `/public` —
    deliberate deviation from the FR's literal "residents can report
    incidents" text. FR-SAF-009's no-account rule is scoped to *rescue* for
    life-safety reasons; there is no equivalent argument for an anonymous
    *photo* upload, and one would hand the internet a write to a volume
    Caddy serves. Someone in danger uses `/rescue`, not this.

    An explicit active event is honored. A legacy omission is auto-resolved
    only when exactly one event is active; with none, the report remains
    event-null, and with several the caller must choose.
    """
    event = None
    if body.event_id is not None:
        event = await evacuation_service.require_active_event(session, body.event_id)
    else:
        active_events = await evacuation_service.list_active_events(session, limit=2)
        if len(active_events) == 1:
            event = active_events[0]
        elif len(active_events) > 1:
            raise ConflictError("Multiple emergency events are active. Select one for this report.")
    photo_path = await save_upload(photo, subdir="incident-reports") if photo is not None else None
    location = (
        func.ST_SetSRID(func.ST_MakePoint(body.longitude, body.latitude), 4326)
        if body.latitude is not None and body.longitude is not None
        else None
    )
    row = IncidentReport(
        event_id=event.id if event is not None else None,
        reported_by_user_id=actor.id,
        type=body.type,
        description=body.description,
        location=location,
        location_note=body.location_note,
        photo_path=photo_path,
    )
    session.add(row)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="incident_report.create",
        entity_type="incident_report",
        entity_id=row.id,
        ip=ip,
    )
    await session.commit()
    return await _incident_report_out(session, row)


async def list_incident_reports(
    session: AsyncSession, *, status: str | None = None, page: int = 1, size: int = 20
) -> Page[IncidentReportOut]:
    stmt = select(IncidentReport).order_by(IncidentReport.created_at.desc())
    if status is not None:
        stmt = stmt.where(IncidentReport.status == status)
    total = (await session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await session.execute(stmt.limit(size).offset((page - 1) * size))).scalars().all()
    items = [await _incident_report_out(session, row) for row in rows]
    return Page[IncidentReportOut](items=items, **page_meta(total, page, size))


async def get_incident_report_or_404(session: AsyncSession, report_id: uuid.UUID) -> IncidentReport:
    row = await session.get(IncidentReport, report_id)
    if row is None:
        raise NotFoundError("Incident report not found.")
    return row


async def review_incident_report(
    session: AsyncSession,
    report_id: uuid.UUID,
    *,
    body: IncidentReportReview,
    actor: AuthenticatedUser,
    ip: str | None,
) -> IncidentReportOut:
    """FR-SAF-016. `body`'s own validator already rejects a missing
    `dismissal_reason` (422); the database CHECK is the second line of
    defence, not the first."""
    row = await get_incident_report_or_404(session, report_id)
    row.status = body.status
    if body.status == "dismissed":
        row.dismissal_reason = body.dismissal_reason
    else:
        row.verified_by_user_id = actor.id
        row.verified_at = datetime.now(UTC)

    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="incident_report.review",
        entity_type="incident_report",
        entity_id=row.id,
        changes={"status": row.status},
        ip=ip,
    )
    await session.commit()
    return await _incident_report_out(session, row)


async def get_safety_ledger(
    session: AsyncSession,
    *,
    event_id: uuid.UUID | None = None,
    status: str | None = None,
    area_id: uuid.UUID | None = None,
    subject_type: str | None = None,
    set_method: str | None = None,
    search: str | None = None,
    current_only: bool = False,
    page: int = 1,
    size: int = 20,
    user: AuthenticatedUser,
) -> SafetyLedgerPageOut:
    """Disaster safety audit log and check-in timeline stream."""
    stmt = (
        select(
            SafetyStatus,
            Member,
            Household,
            Area,
            UnregisteredPerson,
        )
        .outerjoin(Member, SafetyStatus.member_id == Member.id)
        .outerjoin(Household, Member.household_id == Household.id)
        .outerjoin(Area, Household.area_id == Area.id)
        .outerjoin(
            UnregisteredPerson,
            SafetyStatus.unregistered_person_id == UnregisteredPerson.id,
        )
    )

    if event_id is not None:
        stmt = stmt.where(SafetyStatus.event_id == event_id)
    if current_only:
        stmt = stmt.where(SafetyStatus.superseded_at.is_(None))
    if status is not None:
        stmt = stmt.where(SafetyStatus.status == status)
    if set_method is not None:
        stmt = stmt.where(SafetyStatus.set_method == set_method)
    if subject_type == "registered_member":
        stmt = stmt.where(SafetyStatus.member_id.is_not(None))
    elif subject_type == "unregistered_person":
        stmt = stmt.where(SafetyStatus.unregistered_person_id.is_not(None))
    if area_id is not None:
        stmt = stmt.where(Household.area_id == area_id)

    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            (Member.full_name.ilike(pattern))
            | (Household.reference_no.ilike(pattern))
            | (Household.contact_number.ilike(pattern))
            | (UnregisteredPerson.full_name.ilike(pattern))
            | (UnregisteredPerson.contact_number.ilike(pattern))
        )

    stmt = apply_area_scope(stmt, user, Household.area_id)
    stmt = stmt.order_by(SafetyStatus.set_at.desc())

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar_one()

    paginated_stmt = stmt.limit(size).offset((page - 1) * size)
    rows = (await session.execute(paginated_stmt)).all()

    user_ids: set[uuid.UUID] = set()
    member_ids: set[uuid.UUID] = set()
    unreg_ids: set[uuid.UUID] = set()

    for s_row, m_row, _h_row, _a_row, u_row in rows:
        if s_row.set_by_user_id:
            user_ids.add(s_row.set_by_user_id)
        if m_row:
            member_ids.add(m_row.id)
        if u_row:
            unreg_ids.add(u_row.id)

    names_map = await _user_names(session, user_ids)

    center_assignments: dict[uuid.UUID, tuple[uuid.UUID, str]] = {}
    if member_ids or unreg_ids:
        checkin_conditions = []
        if member_ids:
            checkin_conditions.append(EvacCheckin.member_id.in_(member_ids))
        if unreg_ids:
            checkin_conditions.append(EvacCheckin.unregistered_person_id.in_(unreg_ids))

        if checkin_conditions:
            cond = (
                checkin_conditions[0]
                if len(checkin_conditions) == 1
                else (checkin_conditions[0] | checkin_conditions[1])
            )
            checkin_stmt = (
                select(
                    EvacCheckin.member_id,
                    EvacCheckin.unregistered_person_id,
                    EvacCenter.id,
                    Facility.name,
                )
                .join(EvacCenter, EvacCheckin.evac_center_id == EvacCenter.id)
                .join(Facility, EvacCenter.facility_id == Facility.id)
                .where(EvacCheckin.checked_out_at.is_(None), cond)
            )
            if event_id is not None:
                checkin_stmt = checkin_stmt.where(EvacCheckin.event_id == event_id)
            for m_id, u_id, c_id, f_name in (await session.execute(checkin_stmt)).all():
                if m_id:
                    center_assignments[m_id] = (c_id, f_name)
                if u_id:
                    center_assignments[u_id] = (c_id, f_name)

    items: list[SafetyCheckinLogItem] = []
    for s_row, m_row, h_row, a_row, u_row in rows:
        set_by = names_map.get(s_row.set_by_user_id) if s_row.set_by_user_id else None
        if m_row:
            c_info = center_assignments.get(m_row.id)
            items.append(
                SafetyCheckinLogItem(
                    id=s_row.id,
                    timestamp=s_row.set_at,
                    subject_type="registered_member",
                    person_name=m_row.full_name,
                    is_head=m_row.is_head,
                    member_id=m_row.id,
                    unregistered_person_id=None,
                    household_id=h_row.id if h_row else None,
                    household_reference_no=h_row.reference_no if h_row else None,
                    area_id=a_row.id if a_row else None,
                    area_name=a_row.name if a_row else None,
                    contact_number=h_row.contact_number if h_row else None,
                    status=s_row.status,
                    set_method=s_row.set_method,
                    set_by_name=set_by,
                    evac_center_id=c_info[0] if c_info else None,
                    evac_center_name=c_info[1] if c_info else None,
                    is_current=s_row.superseded_at is None,
                    vulnerability_flags=list(_member_flags(m_row)),
                    notes=None,
                )
            )
        elif u_row:
            c_info = center_assignments.get(u_row.id)
            flags: list[str] = [
                f for f in VULNERABILITY_FLAGS if getattr(u_row, f, False)
            ]
            items.append(
                SafetyCheckinLogItem(
                    id=s_row.id,
                    timestamp=s_row.set_at,
                    subject_type="unregistered_person",
                    person_name=u_row.full_name,
                    is_head=False,
                    member_id=None,
                    unregistered_person_id=u_row.id,
                    household_id=None,
                    household_reference_no=None,
                    area_id=None,
                    area_name=None,
                    contact_number=u_row.contact_number,
                    status=s_row.status,
                    set_method=s_row.set_method,
                    set_by_name=set_by,
                    evac_center_id=c_info[0] if c_info else None,
                    evac_center_name=c_info[1] if c_info else None,
                    is_current=s_row.superseded_at is None,
                    vulnerability_flags=flags,
                    notes=u_row.location_note,
                )
            )

    summary_out: AccountedForOut | None = None
    if event_id is not None:
        try:
            event = await evacuation_service.get_event_or_404(session, event_id)
            summary_out = await accounted_for_summary(session, event=event, user=user)
        except Exception:
            pass

    meta = page_meta(total, page, size)
    return SafetyLedgerPageOut(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=meta["pages"],
        summary=summary_out,
    )


async def get_person_safety_journey(
    session: AsyncSession,
    *,
    subject_type: str,
    subject_id: uuid.UUID,
    user: AuthenticatedUser,
) -> PersonSafetyJourneyOut:
    """Complete chronological disaster history for an individual resident or walk-in."""
    timeline: list[PersonTimelineEntry] = []
    current_status: str = "unaccounted"
    current_center: str | None = None

    if subject_type == "registered_member":
        member = await session.get(Member, subject_id)
        if member is None or member.deleted_at is not None:
            raise NotFoundError("Member not found.")
        household = (
            await session.get(Household, member.household_id) if member.household_id else None
        )
        area = (
            await session.get(Area, household.area_id) if household and household.area_id else None
        )

        status_rows = (
            await session.execute(
                select(SafetyStatus)
                .where(SafetyStatus.member_id == subject_id)
                .order_by(SafetyStatus.set_at.desc())
            )
        ).scalars().all()

        user_ids = {s.set_by_user_id for s in status_rows if s.set_by_user_id}
        names_map = await _user_names(session, user_ids)

        for s in status_rows:
            if s.superseded_at is None:
                current_status = s.status
            actor_label = names_map.get(s.set_by_user_id, "System / Officer")
            method_desc = {
                "self": "Self-reported via Resident Portal",
                "assisted": f"Assisted check-in by {actor_label}",
                "household_bulk": "Household check-in by Head",
            }.get(s.set_method, s.set_method)

            status_label = {
                "safe": "Declared Safe",
                "needs_rescue": "Flagged as Needing Rescue",
                "unaccounted": "Marked Unaccounted",
            }.get(s.status, s.status)

            timeline.append(
                PersonTimelineEntry(
                    id=s.id,
                    timestamp=s.set_at,
                    type="safety_status",
                    title=status_label,
                    description=method_desc,
                    status=s.status,
                    actor_name=actor_label,
                    center_name=None,
                )
            )

        checkin_rows = (
            await session.execute(
                select(EvacCheckin, Facility.name)
                .join(EvacCenter, EvacCheckin.evac_center_id == EvacCenter.id)
                .join(Facility, EvacCenter.facility_id == Facility.id)
                .where(EvacCheckin.member_id == subject_id)
                .order_by(EvacCheckin.checked_in_at.desc())
            )
        ).all()

        for c_row, f_name in checkin_rows:
            if c_row.checked_out_at is None and not current_center:
                current_center = f_name
            timeline.append(
                PersonTimelineEntry(
                    id=c_row.id,
                    timestamp=c_row.checked_in_at,
                    type="evac_checkin",
                    title="Checked in to Evacuation Center",
                    description=f"Admitted to {f_name}",
                    status="sheltered",
                    actor_name=None,
                    center_name=f_name,
                )
            )
            if c_row.checked_out_at is not None:
                timeline.append(
                    PersonTimelineEntry(
                        id=uuid.uuid4(),
                        timestamp=c_row.checked_out_at,
                        type="evac_checkout",
                        title="Checked out of Evacuation Center",
                        description=f"Departed from {f_name}",
                        status="checked_out",
                        actor_name=None,
                        center_name=f_name,
                    )
                )

        if household:
            rescue_rows = (
                await session.execute(
                    select(RescueRequest)
                    .where(RescueRequest.household_id == household.id)
                    .order_by(RescueRequest.created_at.desc())
                )
            ).scalars().all()
            for r in rescue_rows:
                timeline.append(
                    PersonTimelineEntry(
                        id=r.id,
                        timestamp=r.created_at,
                        type="rescue_request",
                        title=f"Rescue Request Logged (Priority {r.priority or 'TBD'})",
                        description=r.description,
                        status=r.status,
                        actor_name=r.requester_name,
                        center_name=None,
                    )
                )

        timeline.sort(key=lambda t: t.timestamp, reverse=True)

        return PersonSafetyJourneyOut(
            subject_id=member.id,
            subject_type="registered_member",
            full_name=member.full_name,
            is_head=member.is_head,
            household_reference_no=household.reference_no if household else None,
            area_name=area.name if area else None,
            contact_number=household.contact_number if household else None,
            address=household.street_address if household else None,
            vulnerability_flags=list(_member_flags(member)),
            current_status=current_status,
            current_evac_center_name=current_center,
            timeline=timeline,
        )

    else:
        person = await session.get(UnregisteredPerson, subject_id)
        if person is None:
            raise NotFoundError("Unregistered person not found.")

        status_rows = (
            await session.execute(
                select(SafetyStatus)
                .where(SafetyStatus.unregistered_person_id == subject_id)
                .order_by(SafetyStatus.set_at.desc())
            )
        ).scalars().all()

        user_ids = {s.set_by_user_id for s in status_rows if s.set_by_user_id}
        names_map = await _user_names(session, user_ids)

        for s in status_rows:
            if s.superseded_at is None:
                current_status = s.status
            actor_label = names_map.get(s.set_by_user_id, "Officer")
            timeline.append(
                PersonTimelineEntry(
                    id=s.id,
                    timestamp=s.set_at,
                    type="safety_status",
                    title=f"Status set to {s.status.replace('_', ' ').title()}",
                    description=f"Recorded by {actor_label} ({s.set_method})",
                    status=s.status,
                    actor_name=actor_label,
                    center_name=None,
                )
            )

        checkin_rows = (
            await session.execute(
                select(EvacCheckin, Facility.name)
                .join(EvacCenter, EvacCheckin.evac_center_id == EvacCenter.id)
                .join(Facility, EvacCenter.facility_id == Facility.id)
                .where(EvacCheckin.unregistered_person_id == subject_id)
                .order_by(EvacCheckin.checked_in_at.desc())
            )
        ).all()

        for c_row, f_name in checkin_rows:
            if c_row.checked_out_at is None and not current_center:
                current_center = f_name
            timeline.append(
                PersonTimelineEntry(
                    id=c_row.id,
                    timestamp=c_row.checked_in_at,
                    type="evac_checkin",
                    title="Walk-In Triage & Shelter Check-In",
                    description=f"Admitted to {f_name}",
                    status="sheltered",
                    actor_name=None,
                    center_name=f_name,
                )
            )
            if c_row.checked_out_at is not None:
                timeline.append(
                    PersonTimelineEntry(
                        id=uuid.uuid4(),
                        timestamp=c_row.checked_out_at,
                        type="evac_checkout",
                        title="Checked out of Evacuation Center",
                        description=f"Departed from {f_name}",
                        status="checked_out",
                        actor_name=None,
                        center_name=f_name,
                    )
                )

        flags = [f for f in VULNERABILITY_FLAGS if getattr(person, f, False)]
        timeline.sort(key=lambda t: t.timestamp, reverse=True)

        return PersonSafetyJourneyOut(
            subject_id=person.id,
            subject_type="unregistered_person",
            full_name=person.full_name,
            is_head=False,
            household_reference_no=None,
            area_name=None,
            contact_number=person.contact_number,
            address=person.location_note,
            vulnerability_flags=flags,
            current_status=current_status,
            current_evac_center_name=current_center,
            timeline=timeline,
        )
