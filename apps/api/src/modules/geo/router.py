"""HTTP surface for the geo module (FR-SYS-013, FR-SYS-015, FR-MAP-*).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from src.core.deps import CurrentUser, require_role
from src.db.session import DbSessionDep
from src.modules.geo import service
from src.modules.geo.schemas import (
    AreaOut,
    AreaPatch,
    FacilityIn,
    FacilityOut,
    HotlineIn,
    HotlineOut,
    PublicArea,
    PublicFacility,
    PublicHotline,
)

public_router = APIRouter(tags=["geo"])
admin_router = APIRouter(tags=["geo"])


# --- public --------------------------------------------------------------------


@public_router.get("/hotlines", summary="Emergency hotline directory")
async def public_hotlines(session: DbSessionDep) -> list[PublicHotline]:
    rows = await service.list_hotlines(session)
    return [
        PublicHotline(id=h.id, label=h.label, number=h.number, type=h.type, sort_order=h.sort_order)
        for h in rows
    ]


@public_router.get("/facilities", summary="Barangay facilities")
async def public_facilities(session: DbSessionDep, type: str | None = None) -> list[PublicFacility]:
    return await service.list_facilities(session, type_filter=type)


@public_router.get("/areas", summary="Barangay areas — names only, no personal data")
async def public_areas(session: DbSessionDep) -> list[PublicArea]:
    areas = await service.list_areas(session)
    return [service.area_to_public(a) for a in areas]


# --- admin ----------------------------------------------------------------------


@admin_router.get(
    "/hotlines",
    dependencies=[Depends(require_role("admin", "sk"))],
    summary="List hotlines (admin)",
)
async def admin_list_hotlines(session: DbSessionDep) -> list[HotlineOut]:
    rows = await service.list_hotlines(session, active_only=False)
    return [
        HotlineOut(
            id=h.id,
            label=h.label,
            number=h.number,
            type=h.type,
            sort_order=h.sort_order,
            is_active=h.is_active,
        )
        for h in rows
    ]


@admin_router.post(
    "/hotlines", dependencies=[Depends(require_role("admin"))], summary="Create a hotline"
)
async def admin_create_hotline(
    body: HotlineIn, session: DbSessionDep, user: CurrentUser
) -> HotlineOut:
    hotline = await service.create_hotline(session, body, actor_id=user.id)
    return HotlineOut(
        id=hotline.id,
        label=hotline.label,
        number=hotline.number,
        type=hotline.type,
        sort_order=hotline.sort_order,
        is_active=hotline.is_active,
    )


@admin_router.patch(
    "/hotlines/{hotline_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Update a hotline",
)
async def admin_update_hotline(
    hotline_id: uuid.UUID, body: HotlineIn, session: DbSessionDep, user: CurrentUser
) -> HotlineOut:
    hotline = await service.update_hotline(session, hotline_id, body, actor_id=user.id)
    return HotlineOut(
        id=hotline.id,
        label=hotline.label,
        number=hotline.number,
        type=hotline.type,
        sort_order=hotline.sort_order,
        is_active=hotline.is_active,
    )


@admin_router.delete(
    "/hotlines/{hotline_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Remove a hotline",
)
async def admin_delete_hotline(
    hotline_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.delete_hotline(session, hotline_id, actor_id=user.id)
    return {"ok": True}


@admin_router.get(
    "/facilities",
    dependencies=[Depends(require_role("admin", "bhw", "sk"))],
    summary="List facilities (admin)",
)
async def admin_list_facilities(session: DbSessionDep) -> list[PublicFacility]:
    return await service.list_facilities(session, active_only=False)


@admin_router.post(
    "/facilities", dependencies=[Depends(require_role("admin"))], summary="Add a facility"
)
async def admin_create_facility(
    body: FacilityIn, session: DbSessionDep, user: CurrentUser
) -> FacilityOut:
    facility = await service.create_facility(session, body, actor_id=user.id)
    return await service.facility_out(session, facility)


@admin_router.patch(
    "/facilities/{facility_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Update a facility",
)
async def admin_update_facility(
    facility_id: uuid.UUID, body: FacilityIn, session: DbSessionDep, user: CurrentUser
) -> FacilityOut:
    facility = await service.update_facility(session, facility_id, body, actor_id=user.id)
    return await service.facility_out(session, facility)


@admin_router.delete(
    "/facilities/{facility_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Remove a facility",
)
async def admin_delete_facility(
    facility_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.delete_facility(session, facility_id, actor_id=user.id)
    return {"ok": True}


@admin_router.get(
    "/areas",
    dependencies=[Depends(require_role("admin", "bhw", "sk"))],
    summary="List areas (admin)",
)
async def admin_list_areas(session: DbSessionDep) -> list[AreaOut]:
    areas = await service.list_areas(session)
    return [service.area_to_out(a) for a in areas]


@admin_router.patch(
    "/areas/{area_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Edit an area's name/code/exposure",
)
async def admin_update_area(
    area_id: uuid.UUID, body: AreaPatch, session: DbSessionDep, user: CurrentUser
) -> AreaOut:
    area = await service.update_area(session, area_id, body, actor_id=user.id)
    return service.area_to_out(area)
