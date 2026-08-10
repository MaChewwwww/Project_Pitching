"""Business logic and transaction boundaries for the registry module (FR-REG-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).

**Scope note.** Self-registration (FR-REG-001), BHW-assisted registration
(FR-REG-002), and minimal duplicate detection/merge (FR-REG-010) land here.
Editing an existing household (FR-REG-009) and splitting a member out
(FR-REG-026) remain out of scope — see `models.py`'s module docstring.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Literal, cast

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from src.core.audit import write_audit
from src.core.deps import AuthenticatedUser, apply_area_scope
from src.core.errors import ConflictError, NotFoundError, PermissionDeniedError
from src.core.pagination import Page, page_meta
from src.modules.geo import service as geo_service
from src.modules.geo.models import Area  # join-only, same precedent as alerts/service.py
from src.modules.geo.service import point_to_geojson
from src.modules.registry.models import Household, HouseholdMerge, Member
from src.modules.registry.schemas import (
    DuplicateCandidate,
    HouseholdCreateBhw,
    HouseholdCreateResponse,
    HouseholdCreateSelf,
    HouseholdMergeRequest,
    HouseholdOut,
    MemberIn,
    MemberOut,
)
from src.modules.users import service as users_service

DUPLICATE_NAME_SIMILARITY_THRESHOLD = 0.5
"""Calibrated against the seeded dataset, not picked blind: at 0.4, common
Filipino surnames across 200 same-area synthetic households produced ~75%
false-positive flags (mostly 0.4-0.49 pairs sharing a common name fragment,
not real duplicates). 0.5 keeps genuinely identical or near-identical names
while dropping most of that noise — still a rough heuristic, not a tuned
model; FR-REG-010's frs_nfrs.md note says as much."""


# --- read aggregates (unchanged) ----------------------------------------------


async def counts_by_area(session: AsyncSession) -> dict[uuid.UUID, tuple[int, int]]:
    """`{area_id: (household_count, member_count)}` — derived, never stored
    (NFR-DAT-005). Registered counts are always `COUNT(*)` at query time."""
    household_rows = (
        await session.execute(
            select(Household.area_id, func.count(Household.id))
            .where(Household.deleted_at.is_(None))
            .group_by(Household.area_id)
        )
    ).all()
    household_by_area = dict(household_rows)

    member_rows = (
        await session.execute(
            select(Household.area_id, func.count(Member.id))
            .join(Member, Member.household_id == Household.id)
            .where(Household.deleted_at.is_(None), Member.deleted_at.is_(None))
            .group_by(Household.area_id)
        )
    ).all()
    member_by_area = dict(member_rows)

    area_ids = set(household_by_area) | set(member_by_area)
    return {aid: (household_by_area.get(aid, 0), member_by_area.get(aid, 0)) for aid in area_ids}


async def risk_counts_by_area(session: AsyncSession) -> dict[uuid.UUID, tuple[int, int, int]]:
    """`{area_id: (low, med, high)}` — derived from waterway_proximity.
    - 'far' => low risk
    - 'near' => medium risk
    - 'very_near' => high risk
    """
    rows = (
        await session.execute(
            select(
                Household.area_id,
                func.count().filter(Household.waterway_proximity == "far").label("low"),
                func.count().filter(Household.waterway_proximity == "near").label("med"),
                func.count().filter(Household.waterway_proximity == "very_near").label("high"),
            )
            .where(Household.deleted_at.is_(None))
            .group_by(Household.area_id)
        )
    ).all()
    return {row[0]: (row[1], row[2], row[3]) for row in rows}


async def total_counts(session: AsyncSession) -> tuple[int, int]:
    households = (
        await session.execute(
            select(func.count(Household.id)).where(Household.deleted_at.is_(None))
        )
    ).scalar_one()
    members = (
        await session.execute(
            select(func.count(Member.id))
            .join(Household, Member.household_id == Household.id)
            .where(Member.deleted_at.is_(None), Household.deleted_at.is_(None))
        )
    ).scalar_one()
    return households, members


# --- helpers -------------------------------------------------------------------


def _derive_age_flags(birth_date: date | None) -> tuple[bool, bool]:
    """`(is_child, is_senior)` from a birth date — see `HeadMemberIn`'s docstring
    for why the self-registration path derives these instead of asking."""
    if birth_date is None:
        return False, False
    today = datetime.now(UTC).date()
    had_birthday = (today.month, today.day) >= (birth_date.month, birth_date.day)
    age = today.year - birth_date.year - (0 if had_birthday else 1)
    return age < 18, age >= 60


async def _next_reference_no(session: AsyncSession) -> str:
    """Atomic and race-safe — `nextval()` on a bare sequence, not tied to any
    column's own identity, so it can be read ahead of the INSERT. Gaps on
    rollback are fine; only uniqueness matters (`household.reference_no` is
    UNIQUE NOT NULL). Prefixed distinctly from seed data's `HH-SEED-*` rows."""
    value = (await session.execute(select(func.nextval("household_reference_no_seq")))).scalar_one()
    return f"HH-{datetime.now(UTC).year}-{value:06d}"


async def _location_geojson(session: AsyncSession, household_id: uuid.UUID):
    """Mirrors `geo.service.facility_out`'s pattern: read the geometry back via
    `ST_AsGeoJSON` rather than relying on the ORM's loaded WKBElement, since
    `shapely` (needed for the `to_shape` branch of `point_to_geojson`) is not a
    guaranteed dependency here."""
    geojson = (
        await session.execute(
            select(func.ST_AsGeoJSON(Household.location)).where(Household.id == household_id)
        )
    ).scalar_one()
    return point_to_geojson(geojson)


def _member_out(member: Member) -> MemberOut:
    return MemberOut(
        id=member.id,
        full_name=member.full_name,
        birth_date=member.birth_date,
        sex=member.sex,
        relationship_to_head=member.relationship_to_head,
        is_head=member.is_head,
        is_child=member.is_child,
        is_senior=member.is_senior,
        is_pwd=member.is_pwd,
        is_pregnant=member.is_pregnant,
        is_lactating=member.is_lactating,
        has_chronic_condition=member.has_chronic_condition,
        chronic_condition_note=member.chronic_condition_note,
        is_bedridden=member.is_bedridden,
    )


def _new_member(
    data: MemberIn, *, household_id: uuid.UUID, is_head: bool, derive_age_from_birthdate: bool
) -> Member:
    """`derive_age_from_birthdate` is keyed to which *flow* this is, not to
    `is_head` — the self-registration head always knows their own birthdate
    (derive it), while a BHW may be registering someone, head or not, without
    an exact one (keep the explicit checkboxes)."""
    is_child, is_senior = (
        _derive_age_flags(data.birth_date)
        if derive_age_from_birthdate
        else (data.is_child, data.is_senior)
    )
    return Member(
        household_id=household_id,
        full_name=data.full_name,
        birth_date=data.birth_date,
        sex=data.sex,
        relationship_to_head=data.relationship_to_head,
        is_head=is_head,
        is_child=is_child,
        is_senior=is_senior,
        is_pwd=data.is_pwd,
        is_pregnant=data.is_pregnant,
        is_lactating=data.is_lactating,
        has_chronic_condition=data.has_chronic_condition,
        chronic_condition_note=data.chronic_condition_note,
        is_bedridden=data.is_bedridden,
    )


async def _household_out(
    session: AsyncSession,
    household: Household,
    *,
    area_name: str | None,
    has_possible_duplicate: bool,
    member_count: int,
) -> HouseholdOut:
    return HouseholdOut(
        id=household.id,
        reference_no=household.reference_no,
        head_name=household.head_name,
        head_user_id=household.head_user_id,
        contact_number=household.contact_number,
        is_unreachable_by_phone=household.is_unreachable_by_phone,
        area_id=household.area_id,
        area_name=area_name,
        street_address=household.street_address,
        waterway_proximity=household.waterway_proximity,
        location=await _location_geojson(session, household.id),
        source=cast(Literal["self", "bhw"], household.source),
        verified_at=household.verified_at,
        has_possible_duplicate=has_possible_duplicate,
        member_count=member_count,
        created_at=household.created_at,
    )


# --- duplicate detection (FR-REG-010) ------------------------------------------


async def find_duplicate_candidates(
    session: AsyncSession, household: Household
) -> list[DuplicateCandidate]:
    """Same area, plus either a similar head name (pg_trgm) or a member sharing
    `(full_name, birth_date)` with one of `household`'s own members. Advisory
    only — this never blocks creation, it only flags the pair for admin review
    (BR-1.9's "flagged, not blocked" — a real family must never be turned away).
    """
    name_matches = (
        (
            await session.execute(
                select(Household).where(
                    Household.id != household.id,
                    Household.deleted_at.is_(None),
                    Household.merged_into_id.is_(None),
                    Household.area_id == household.area_id,
                    func.similarity(Household.head_name, household.head_name)
                    > DUPLICATE_NAME_SIMILARITY_THRESHOLD,
                )
            )
        )
        .scalars()
        .all()
    )

    own_members = (
        await session.execute(
            select(Member.full_name, Member.birth_date).where(
                Member.household_id == household.id,
                Member.deleted_at.is_(None),
                Member.birth_date.is_not(None),
            )
        )
    ).all()

    member_matches: list[Household] = []
    if own_members:
        conditions = [
            (Member.full_name == name) & (Member.birth_date == birth_date)
            for name, birth_date in own_members
        ]
        member_matches = list(
            (
                await session.execute(
                    select(Household)
                    .join(Member, Member.household_id == Household.id)
                    .where(
                        Household.id != household.id,
                        Household.deleted_at.is_(None),
                        Household.merged_into_id.is_(None),
                        Household.area_id == household.area_id,
                        Member.deleted_at.is_(None),
                        or_(*conditions),
                    )
                    .distinct()
                )
            )
            .scalars()
            .all()
        )

    candidates: dict[uuid.UUID, DuplicateCandidate] = {}
    for h in name_matches:
        candidates[h.id] = DuplicateCandidate(
            household_id=h.id,
            reference_no=h.reference_no,
            head_name=h.head_name,
            area_id=h.area_id,
            match_reason="name_similarity",
        )
    for h in member_matches:
        candidates.setdefault(
            h.id,
            DuplicateCandidate(
                household_id=h.id,
                reference_no=h.reference_no,
                head_name=h.head_name,
                area_id=h.area_id,
                match_reason="member_match",
            ),
        )
    return list(candidates.values())


async def get_duplicate_candidates_for(
    session: AsyncSession, household_id: uuid.UUID
) -> list[DuplicateCandidate]:
    """The admin merge dialog's actual candidate list — the specific
    households `find_duplicate_candidates` correlates to this one, not every
    flagged household platform-wide. Computed fresh on open rather than
    reusing the list view's `has_possible_duplicate` snapshot, so a household
    merged away moments earlier can't still appear as a candidate."""
    household = await session.get(Household, household_id)
    if household is None:
        raise NotFoundError("Household not found.")
    return await find_duplicate_candidates(session, household)


def _has_duplicate_subquery(household_id_col, area_id_col, head_name_col):
    """A correlated EXISTS for the list view's badge column. Name-similarity
    only (not the member-level check `find_duplicate_candidates` also does) —
    a cheap single-correlated-subquery is enough for a list badge; the full
    reasoning is computed at creation time instead, where it matters more."""
    other = aliased(Household)
    return (
        select(func.count())
        .select_from(other)
        .where(
            other.id != household_id_col,
            other.deleted_at.is_(None),
            other.merged_into_id.is_(None),
            other.area_id == area_id_col,
            func.similarity(other.head_name, head_name_col) > DUPLICATE_NAME_SIMILARITY_THRESHOLD,
        )
        .correlate(Household)
        .scalar_subquery()
    ) > 0


# --- create: self-registration (FR-REG-001) ------------------------------------


async def create_household_self(
    session: AsyncSession, *, user: AuthenticatedUser, body: HouseholdCreateSelf
) -> HouseholdCreateResponse:
    existing = await session.execute(
        select(Household.id).where(
            Household.head_user_id == user.id, Household.deleted_at.is_(None)
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("You already have a registered household.")

    area = await geo_service.get_area_or_404(session, body.area_id)
    account = await users_service.get_user_or_404(session, user.id)

    location = None
    if body.latitude is not None and body.longitude is not None:
        location = func.ST_SetSRID(func.ST_MakePoint(body.longitude, body.latitude), 4326)

    household = Household(
        reference_no=await _next_reference_no(session),
        head_name=account.full_name,
        head_user_id=user.id,
        contact_number=body.contact_number,
        is_unreachable_by_phone=body.is_unreachable_by_phone,
        area_id=area.id,
        street_address=body.street_address,
        waterway_proximity=body.waterway_proximity,
        location=location,
        source="self",
        created_by_user_id=user.id,
        # FR-REG-011 — no separate manual-review step: a resident completing
        # their own onboarding (behind a login) is the verification. Product
        # decision, not the literal acceptance text ("admin marks verified")
        # — see frs_nfrs.md 5.2's note.
        verified_at=datetime.now(UTC),
        verified_by_user_id=user.id,
    )
    session.add(household)
    await session.flush()

    head_member = _new_member(
        MemberIn(full_name=account.full_name, **body.head_member.model_dump()),
        household_id=household.id,
        is_head=True,
        derive_age_from_birthdate=True,
    )
    session.add(head_member)
    await session.flush()

    duplicates = await find_duplicate_candidates(session, household)

    await write_audit(
        session,
        actor_user_id=user.id,
        action="household.create",
        entity_type="household",
        entity_id=household.id,
        changes={"source": "self", "duplicate_candidate_count": len(duplicates)},
    )
    await session.commit()

    return HouseholdCreateResponse(
        household=await _household_out(
            session,
            household,
            area_name=area.name,
            has_possible_duplicate=bool(duplicates),
            member_count=1,
        ),
        members=[_member_out(head_member)],
        duplicate_candidates=duplicates,
    )


# --- create: BHW-assisted registration (FR-REG-002) ----------------------------


async def create_household_bhw(
    session: AsyncSession, *, user: AuthenticatedUser, body: HouseholdCreateBhw
) -> HouseholdCreateResponse:
    if user.role == "bhw" and body.area_id not in user.assigned_area_ids:
        raise PermissionDeniedError("You can only register households in your assigned area.")

    area = await geo_service.get_area_or_404(session, body.area_id)

    location = None
    if body.latitude is not None and body.longitude is not None:
        location = func.ST_SetSRID(func.ST_MakePoint(body.longitude, body.latitude), 4326)

    household = Household(
        reference_no=await _next_reference_no(session),
        head_name=body.head_name,
        head_user_id=None,
        contact_number=body.contact_number,
        is_unreachable_by_phone=body.is_unreachable_by_phone,
        area_id=area.id,
        street_address=body.street_address,
        waterway_proximity=body.waterway_proximity,
        location=location,
        source="bhw",
        created_by_user_id=user.id,
        # FR-REG-011 — a BHW who visited and entered the household in person is
        # the verification; no separate admin review step. Same product
        # decision as create_household_self, see frs_nfrs.md 5.2's note.
        verified_at=datetime.now(UTC),
        verified_by_user_id=user.id,
    )
    session.add(household)
    await session.flush()

    members = [
        _new_member(
            body.head_member,
            household_id=household.id,
            is_head=True,
            derive_age_from_birthdate=False,
        )
    ]
    members += [
        _new_member(m, household_id=household.id, is_head=False, derive_age_from_birthdate=False)
        for m in body.members
    ]
    session.add_all(members)
    await session.flush()

    duplicates = await find_duplicate_candidates(session, household)

    await write_audit(
        session,
        actor_user_id=user.id,
        action="household.create",
        entity_type="household",
        entity_id=household.id,
        changes={
            "source": "bhw",
            "member_count": len(members),
            "duplicate_candidate_count": len(duplicates),
        },
    )
    await session.commit()

    return HouseholdCreateResponse(
        household=await _household_out(
            session,
            household,
            area_name=area.name,
            has_possible_duplicate=bool(duplicates),
            member_count=len(members),
        ),
        members=[_member_out(m) for m in members],
        duplicate_candidates=duplicates,
    )


# --- read: self and admin -------------------------------------------------------


async def get_household_or_404(session: AsyncSession, household_id: uuid.UUID) -> Household:
    """For other modules (safety) that need the ORM row itself, not the DTO —
    `get_household_for_user` below returns `HouseholdOut | None`, which loses
    the columns a join needs. Same precedent as `geo.get_area_or_404`."""
    household = await session.get(Household, household_id)
    if household is None or household.deleted_at is not None:
        raise NotFoundError("Household not found.")
    return household


async def household_for_user_id(session: AsyncSession, user_id: uuid.UUID) -> Household | None:
    """The `head`'s own household row, or `None` if they haven't onboarded yet.
    Exposed for safety's `/me/safety-status` — same reasoning as
    `get_household_or_404` above."""
    return await session.scalar(
        select(Household).where(
            Household.head_user_id == user_id, Household.deleted_at.is_(None)
        )
    )


async def get_household_for_user(session: AsyncSession, user_id: uuid.UUID) -> HouseholdOut | None:
    """`GET /me/household` — `None` drives the onboarding redirect."""
    row = (
        await session.execute(
            select(Household, Area.name)
            .join(Area, Household.area_id == Area.id)
            .where(Household.head_user_id == user_id, Household.deleted_at.is_(None))
        )
    ).one_or_none()
    if row is None:
        return None
    household, area_name = row

    member_count = (
        await session.execute(
            select(func.count(Member.id)).where(
                Member.household_id == household.id, Member.deleted_at.is_(None)
            )
        )
    ).scalar_one()

    return await _household_out(
        session,
        household,
        area_name=area_name,
        has_possible_duplicate=False,
        member_count=member_count,
    )


async def list_households(
    session: AsyncSession,
    *,
    user: AuthenticatedUser,
    page: int = 1,
    size: int = 20,
    flagged: bool = False,
) -> Page[HouseholdOut]:
    member_count_subq = (
        select(func.count(Member.id))
        .where(Member.household_id == Household.id, Member.deleted_at.is_(None))
        .correlate(Household)
        .scalar_subquery()
    )
    has_dup = _has_duplicate_subquery(Household.id, Household.area_id, Household.head_name)

    stmt = (
        select(Household, Area.name, member_count_subq, has_dup)
        .join(Area, Household.area_id == Area.id)
        .where(Household.deleted_at.is_(None))
        .order_by(Household.created_at.desc())
    )
    stmt = apply_area_scope(stmt, user, Household.area_id)
    if flagged:
        stmt = stmt.where(has_dup)

    total = len((await session.execute(stmt)).all())
    rows = (await session.execute(stmt.limit(size).offset((page - 1) * size))).all()

    items = [
        await _household_out(
            session,
            household,
            area_name=area_name,
            has_possible_duplicate=has_duplicate,
            member_count=member_count,
        )
        for household, area_name, member_count, has_duplicate in rows
    ]
    return Page[HouseholdOut](items=items, **page_meta(total, page, size))


# --- merge (FR-REG-010) ---------------------------------------------------------


async def merge_households(
    session: AsyncSession, *, actor: AuthenticatedUser, body: HouseholdMergeRequest
) -> HouseholdOut:
    if body.kept_household_id == body.merged_household_id:
        raise ConflictError("Cannot merge a household into itself.")

    kept = await session.get(Household, body.kept_household_id)
    merged = await session.get(Household, body.merged_household_id)
    if kept is None or merged is None:
        raise NotFoundError("One or both households were not found.")
    if kept.merged_into_id is not None or merged.merged_into_id is not None:
        raise ConflictError("One of these records is already part of a merge.")

    # Demote before re-parenting — `idx_member_one_head` allows only one
    # is_head=true member per household, so the losing household's head must
    # stop being a head before its members move under `kept`.
    await session.execute(
        update(Member)
        .where(
            Member.household_id == merged.id, Member.is_head.is_(True), Member.deleted_at.is_(None)
        )
        .values(is_head=False)
    )
    await session.flush()

    await session.execute(
        update(Member)
        .where(Member.household_id == merged.id, Member.deleted_at.is_(None))
        .values(household_id=kept.id)
    )

    merged.merged_into_id = kept.id
    merged.deleted_at = datetime.now(UTC)

    session.add(
        HouseholdMerge(
            kept_household_id=kept.id,
            merged_household_id=merged.id,
            merged_by_user_id=actor.id,
            notes=body.notes,
        )
    )

    await write_audit(
        session,
        actor_user_id=actor.id,
        action="household.merge",
        entity_type="household",
        entity_id=kept.id,
        changes={"merged_household_id": str(merged.id)},
    )
    await session.commit()
    await session.refresh(kept)

    area_name = (
        await session.execute(select(Area.name).where(Area.id == kept.area_id))
    ).scalar_one_or_none()
    member_count = (
        await session.execute(
            select(func.count(Member.id)).where(
                Member.household_id == kept.id, Member.deleted_at.is_(None)
            )
        )
    ).scalar_one()

    return await _household_out(
        session, kept, area_name=area_name, has_possible_duplicate=False, member_count=member_count
    )
