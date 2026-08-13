"""HTTP surface for the registry module (FR-REG-*).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from src.core.deps import CurrentUser, require_role
from src.core.errors import NotFoundError
from src.core.pagination import Page
from src.db.session import DbSessionDep
from src.modules.registry import service
from src.modules.registry.schemas import (
    DuplicateCandidate,
    HouseholdCreateBhw,
    HouseholdCreateResponse,
    HouseholdCreateSelf,
    HouseholdDetailOut,
    HouseholdMergeRequest,
    HouseholdOut,
    HouseholdUpdate,
    MemberIn,
    MemberPromoteIn,
    MemberTransferIn,
    MemberUpdate,
    RegistryMemberOut,
    RegistrySummary,
)

# `/me` — first occupant of this tier (main.py's me_router previously had zero
# routes mounted).
me_router = APIRouter(tags=["registry"])

# `/admin/households` — separate prefix from every other admin_router module,
# which mount bare resource names at the admin_router root.
admin_router = APIRouter(prefix="/households", tags=["registry"])
members_admin_router = APIRouter(prefix="/members", tags=["registry"])


# --- resident self-service -------------------------------------------------


@me_router.get("/household", summary="The caller's own household, if onboarded")
async def get_my_household(user: CurrentUser, session: DbSessionDep) -> HouseholdDetailOut | None:
    return await service.get_household_for_user(session, user.id)


@me_router.post(
    "/household",
    dependencies=[Depends(require_role("head"))],
    summary="Complete onboarding — creates the household (FR-REG-001)",
)
async def create_my_household(
    body: HouseholdCreateSelf, session: DbSessionDep, user: CurrentUser
) -> HouseholdCreateResponse:
    return await service.create_household_self(session, user=user, body=body)


@me_router.patch("/household", summary="Update the caller's own household")
async def update_my_household(
    body: HouseholdUpdate, session: DbSessionDep, user: CurrentUser
) -> HouseholdDetailOut:
    household = await service.household_for_user_id(session, user.id)
    if household is None:
        raise NotFoundError("Complete onboarding before editing your household.")
    return await service.update_household(
        session,
        household_id=household.id,
        body=body,
        actor=user,
        resident=True,
    )


@me_router.post("/household/members", summary="Add a member to the caller's household")
async def add_my_member(
    body: MemberIn, session: DbSessionDep, user: CurrentUser
) -> RegistryMemberOut:
    household = await service.household_for_user_id(session, user.id)
    if household is None:
        raise NotFoundError("Complete onboarding before adding a citizen.")
    return await service.add_member(
        session, household_id=household.id, body=body, actor=user, resident=True
    )


@me_router.patch(
    "/household/members/{member_id}", summary="Update a member in the caller's household"
)
async def update_my_member(
    member_id: uuid.UUID, body: MemberUpdate, session: DbSessionDep, user: CurrentUser
) -> RegistryMemberOut:
    return await service.update_member(
        session, member_id=member_id, body=body, actor=user, resident=True
    )


@me_router.delete(
    "/household/members/{member_id}", summary="Archive a member in the caller's household"
)
async def archive_my_member(
    member_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.archive_member(session, member_id=member_id, actor=user, resident=True)
    return {"ok": True}


# --- admin / BHW -------------------------------------------------------------


@admin_router.get(
    "",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="List households, area-scoped for a BHW",
)
async def admin_list_households(
    session: DbSessionDep,
    user: CurrentUser,
    page: int = 1,
    size: int = 20,
    flagged: bool = False,
    query: str | None = None,
    area_id: uuid.UUID | None = None,
    source: str | None = None,
) -> Page[HouseholdOut]:
    return await service.list_households(
        session,
        user=user,
        page=page,
        size=size,
        flagged=flagged,
        query=query,
        area_id=area_id,
        source=source if source in {"self", "bhw"} else None,
    )


@admin_router.post(
    "",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="BHW-assisted registration — one visit, no account attached (FR-REG-002)",
)
async def admin_create_household(
    body: HouseholdCreateBhw, session: DbSessionDep, user: CurrentUser
) -> HouseholdCreateResponse:
    return await service.create_household_bhw(session, user=user, body=body)


@admin_router.get("/summary", dependencies=[Depends(require_role("admin", "bhw"))])
async def admin_registry_summary(session: DbSessionDep, user: CurrentUser) -> RegistrySummary:
    return await service.get_registry_summary(session, user=user)


@admin_router.get(
    "/{household_id}/duplicates",
    dependencies=[Depends(require_role("admin"))],
    summary="Households that might be the same as this one (FR-REG-010)",
)
async def admin_household_duplicates(
    household_id: uuid.UUID, session: DbSessionDep
) -> list[DuplicateCandidate]:
    return await service.get_duplicate_candidates_for(session, household_id)


@admin_router.get("/{household_id}", dependencies=[Depends(require_role("admin", "bhw"))])
async def admin_get_household(
    household_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> HouseholdDetailOut:
    return await service.get_household_detail(session, household_id=household_id, user=user)


@admin_router.patch("/{household_id}", dependencies=[Depends(require_role("admin", "bhw"))])
async def admin_update_household(
    household_id: uuid.UUID, body: HouseholdUpdate, session: DbSessionDep, user: CurrentUser
) -> HouseholdDetailOut:
    return await service.update_household(session, household_id=household_id, body=body, actor=user)


@admin_router.post("/{household_id}/members", dependencies=[Depends(require_role("admin", "bhw"))])
async def admin_add_member(
    household_id: uuid.UUID, body: MemberIn, session: DbSessionDep, user: CurrentUser
) -> RegistryMemberOut:
    return await service.add_member(session, household_id=household_id, body=body, actor=user)


@admin_router.delete("/{household_id}", dependencies=[Depends(require_role("admin"))])
async def admin_archive_household(
    household_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.archive_household(session, household_id=household_id, actor=user)
    return {"ok": True}


@admin_router.post(
    "/merge",
    dependencies=[Depends(require_role("admin"))],
    summary="Merge a flagged duplicate into another household (FR-REG-010)",
)
async def admin_merge_households(
    body: HouseholdMergeRequest, session: DbSessionDep, user: CurrentUser
) -> HouseholdOut:
    return await service.merge_households(session, actor=user, body=body)


@members_admin_router.get("", dependencies=[Depends(require_role("admin", "bhw"))])
async def admin_list_members(
    session: DbSessionDep,
    user: CurrentUser,
    page: int = 1,
    size: int = 20,
    query: str | None = None,
    area_id: uuid.UUID | None = None,
    head_only: bool = False,
    vulnerable: bool = False,
) -> Page[RegistryMemberOut]:
    return await service.list_members(
        session,
        user=user,
        page=page,
        size=size,
        query=query,
        area_id=area_id,
        head_only=head_only,
        vulnerable=vulnerable,
    )


@members_admin_router.patch("/{member_id}", dependencies=[Depends(require_role("admin", "bhw"))])
async def admin_update_member(
    member_id: uuid.UUID, body: MemberUpdate, session: DbSessionDep, user: CurrentUser
) -> RegistryMemberOut:
    return await service.update_member(session, member_id=member_id, body=body, actor=user)


@members_admin_router.get("/{member_id}", dependencies=[Depends(require_role("admin", "bhw"))])
async def admin_get_member(
    member_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> RegistryMemberOut:
    return await service.get_member(session, member_id=member_id, user=user)


@members_admin_router.delete("/{member_id}", dependencies=[Depends(require_role("admin"))])
async def admin_archive_member(
    member_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.archive_member(session, member_id=member_id, actor=user)
    return {"ok": True}


@members_admin_router.post(
    "/{member_id}/transfer", dependencies=[Depends(require_role("admin", "bhw"))]
)
async def admin_transfer_member(
    member_id: uuid.UUID, body: MemberTransferIn, session: DbSessionDep, user: CurrentUser
) -> RegistryMemberOut:
    return await service.transfer_member(session, member_id=member_id, body=body, actor=user)


@members_admin_router.post(
    "/{member_id}/promote", dependencies=[Depends(require_role("admin", "bhw"))]
)
async def admin_promote_member(
    member_id: uuid.UUID, body: MemberPromoteIn, session: DbSessionDep, user: CurrentUser
) -> HouseholdDetailOut:
    return await service.promote_member(session, member_id=member_id, body=body, actor=user)


@members_admin_router.post(
    "/{member_id}/make-head", dependencies=[Depends(require_role("admin", "bhw"))]
)
async def admin_make_head(
    member_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> HouseholdDetailOut:
    return await service.make_head(session, member_id=member_id, actor=user)
