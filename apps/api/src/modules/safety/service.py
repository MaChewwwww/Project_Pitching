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
from src.modules.evacuation.models import EmergencyEvent
from src.modules.evacuation.schemas import PublicEmergencyEvent
from src.modules.geo.models import Area  # join-only (AGENTS.md Section 5)
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
    HouseholdSafetyOut,
    IncidentReportIn,
    IncidentReportOut,
    IncidentReportReview,
    MemberSafetyOut,
    MySafetyOut,
    RescueRequestAck,
    RescueRequestOut,
    RescueRequestPatch,
    RescueRequestPublicIn,
    SafetyStatusAdminIn,
    SafetyStatusSelfIn,
    UnregisteredPersonIn,
    UnregisteredPersonOut,
    UnregisteredPersonPatch,
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
    "is_child",
    "is_senior",
    "is_pwd",
    "is_pregnant",
    "is_lactating",
    "has_chronic_condition",
    "is_bedridden",
)


def _member_flags(member: Member) -> list[str]:
    return [flag for flag in VULNERABILITY_FLAGS if getattr(member, flag)]


def _event_out(event: EmergencyEvent) -> PublicEmergencyEvent:
    return PublicEmergencyEvent(name=event.name, type=event.type, started_at=event.started_at)


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
        await session.execute(
            select(SafetyStatus).where(
                SafetyStatus.event_id == event_id,
                SafetyStatus.member_id.in_(member_ids),
                SafetyStatus.superseded_at.is_(None),
            )
        )
    ).scalars().all()
    return {row.member_id: row for row in rows}


async def get_household_safety(
    session: AsyncSession, *, event: EmergencyEvent, household_id: uuid.UUID
) -> HouseholdSafetyOut:
    household = await registry_service.get_household_or_404(session, household_id)
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


async def get_my_safety(session: AsyncSession, *, user: AuthenticatedUser) -> MySafetyOut:
    from src.modules.evacuation import service as evacuation_service

    event = await evacuation_service.get_active_event(session)
    if event is None:
        return MySafetyOut(event=None, household=None)

    household = await registry_service.household_for_user_id(session, user.id)
    if household is None:
        return MySafetyOut(event=_event_out(event), household=None)

    household_safety = await get_household_safety(session, event=event, household_id=household.id)
    return MySafetyOut(event=household_safety.event, household=household_safety)


async def set_member_statuses(
    session: AsyncSession,
    *,
    event: EmergencyEvent,
    household_id: uuid.UUID,
    member_ids: list[uuid.UUID],
    status: str,
    actor: AuthenticatedUser,
    set_method: str,
    ip: str | None,
) -> HouseholdSafetyOut:
    for member_id in member_ids:
        await _write_one_status(
            session,
            event_id=event.id,
            member_id=member_id,
            status=status,
            actor=actor,
            set_method=set_method,
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
    ip: str | None,
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
    ip: str | None,
) -> SafetyStatus:
    row = await _write_one_status(
        session,
        event_id=event.id,
        unregistered_person_id=unregistered_person_id,
        status=status,
        actor=actor,
        set_method=set_method,
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
            ip=ip,
        )
        return None

    household_id = body.household_id
    if household_id is None:
        raise PermissionDeniedError("household_id is required for this scope.")

    if body.scope == "household":
        return await set_household_status(
            session,
            event=event,
            household_id=household_id,
            status=body.status,
            actor=actor,
            set_method=set_method,
            acknowledged_member_ids=body.acknowledged_member_ids,
            ip=ip,
        )
    return await set_member_statuses(
        session,
        event=event,
        household_id=household_id,
        member_ids=body.member_ids,
        status=body.status,
        actor=actor,
        set_method=set_method,
        ip=ip,
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


async def _unregistered_out(
    session: AsyncSession, person: UnregisteredPerson
) -> UnregisteredPersonOut:
    status_row = (
        await session.execute(
            select(SafetyStatus).where(
                SafetyStatus.unregistered_person_id == person.id,
                SafetyStatus.superseded_at.is_(None),
            )
        )
    ).scalar_one_or_none()

    recorded_name = None
    if person.recorded_by_user_id is not None:
        names = await _user_names(session, {person.recorded_by_user_id})
        recorded_name = names.get(person.recorded_by_user_id)

    return UnregisteredPersonOut(
        id=person.id,
        created_at=person.created_at,
        full_name=person.full_name,
        contact_number=person.contact_number,
        location=point_to_geojson(person.location),
        location_note=person.location_note,
        # `create_unregistered` always writes an initial status in the same
        # transaction, so this falls back only if that invariant is ever
        # broken by a direct insert — never silently mislabel a real gap.
        status=status_row.status if status_row else "unaccounted",
        recorded_by_name=recorded_name,
        converted_household_id=person.converted_household_id,
    )


async def list_unregistered(
    session: AsyncSession,
    *,
    event_id: uuid.UUID | None = None,
    page: int = 1,
    size: int = 20,
) -> Page[UnregisteredPersonOut]:
    stmt = select(UnregisteredPerson).order_by(UnregisteredPerson.created_at.desc())
    if event_id is not None:
        stmt = stmt.where(UnregisteredPerson.event_id == event_id)
    total = (await session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await session.execute(stmt.limit(size).offset((page - 1) * size))).scalars().all()
    items = [await _unregistered_out(session, row) for row in rows]
    return Page[UnregisteredPersonOut](items=items, **page_meta(total, page, size))


async def create_unregistered(
    session: AsyncSession, *, body: UnregisteredPersonIn, actor: AuthenticatedUser, ip: str | None
) -> UnregisteredPersonOut:
    """FR-SAF-012 — one action records the person **and** their initial
    status (safe or needing rescue), not two. `event_id` always comes from
    the active event, never the client."""
    event = await evacuation_service.require_active_event(session)
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
        ip=ip,
    )
    return await _unregistered_out(session, person)


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
    return await _unregistered_out(session, person)


def _normalize_phone(value: str) -> str:
    """Digits only, then fold a `+63` country code to the equivalent local
    `0`-prefixed form so `+639171234567` and `09171234567` compare equal."""
    digits = _NON_DIGITS_RE.sub("", value)
    if digits.startswith("63") and len(digits) == 12:
        return "0" + digits[2:]
    return digits


async def _match_household(
    session: AsyncSession, contact_number: str | None
) -> Household | None:
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
        await session.execute(
            select(Household).where(
                Household.deleted_at.is_(None), Household.contact_number.is_not(None)
            )
        )
    ).scalars().all()
    matches = [h for h in rows if _normalize_phone(h.contact_number) == target]
    return matches[0] if len(matches) == 1 else None


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
    active_event = await evacuation_service.get_active_event(session)
    for row in untriaged:
        household = await _match_household(session, row.contact_number)
        flags: set[str] = set()
        if household is not None:
            row.household_id = household.id
            flags = await _household_flags(session, household.id)
        if active_event is not None and row.event_id is None:
            row.event_id = active_event.id
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
    stmt = select(func.count()).select_from(RescueRequest).where(
        RescueRequest.status.in_(("pending", "verified", "dispatched"))
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
        reported_by_name=(
            names.get(row.reported_by_user_id) if row.reported_by_user_id else None
        ),
        verified_by_name=(
            names.get(row.verified_by_user_id) if row.verified_by_user_id else None
        ),
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

    `event_id` uses whatever event is active, if any — a report, like a
    rescue request, may reasonably precede a declared event.
    """
    photo_path = await save_upload(photo, subdir="incident-reports") if photo is not None else None
    event = await evacuation_service.get_active_event(session)
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
