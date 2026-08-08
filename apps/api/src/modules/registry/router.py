"""HTTP surface for the registry module (FR-REG-*).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from src.core.deps import CurrentUser, require_role
from src.core.pagination import Page
from src.db.session import DbSessionDep
from src.modules.registry import service
from src.modules.registry.schemas import (
    HouseholdCreateBhw,
    HouseholdCreateResponse,
    HouseholdCreateSelf,
    HouseholdMergeRequest,
    HouseholdOut,
)

# `/me` — first occupant of this tier (main.py's me_router previously had zero
# routes mounted).
me_router = APIRouter(tags=["registry"])

# `/admin/households` — separate prefix from every other admin_router module,
# which mount bare resource names at the admin_router root.
admin_router = APIRouter(prefix="/households", tags=["registry"])


# --- resident self-service -------------------------------------------------


@me_router.get("/household", summary="The caller's own household, if onboarded")
async def get_my_household(user: CurrentUser, session: DbSessionDep) -> HouseholdOut | None:
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


# --- admin / BHW -------------------------------------------------------------


@admin_router.get(
    "",
    dependencies=[Depends(require_role("admin", "bhw", "sk"))],
    summary="List households, area-scoped for a BHW",
)
async def admin_list_households(
    session: DbSessionDep,
    user: CurrentUser,
    page: int = 1,
    size: int = 20,
    flagged: bool = False,
) -> Page[HouseholdOut]:
    return await service.list_households(session, user=user, page=page, size=size, flagged=flagged)


@admin_router.post(
    "",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="BHW-assisted registration — one visit, no account attached (FR-REG-002)",
)
async def admin_create_household(
    body: HouseholdCreateBhw, session: DbSessionDep, user: CurrentUser
) -> HouseholdCreateResponse:
    return await service.create_household_bhw(session, user=user, body=body)


@admin_router.post(
    "/merge",
    dependencies=[Depends(require_role("admin"))],
    summary="Merge a flagged duplicate into another household (FR-REG-010)",
)
async def admin_merge_households(
    body: HouseholdMergeRequest, session: DbSessionDep, user: CurrentUser
) -> HouseholdOut:
    return await service.merge_households(session, actor=user, body=body)
