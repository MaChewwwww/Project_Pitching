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
    AreaBoundaryCollection,
    AreaOut,
    AreaPatch,
    FacilityIn,
    FacilityOut,
    HotlineIn,
    HotlineOut,
    PointResolution,
    PublicArea,
    PublicFacility,
    PublicHotline,
    PublicSiren,
    SirenAuditOut,
    SirenDrillResult,
    SirenIn,
    SirenOut,
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


@public_router.get(
    "/areas/resolve-point",
    response_model=PointResolution,
    summary="Resolve a map pin to its barangay area",
)
async def public_resolve_point(
    latitude: float, longitude: float, session: DbSessionDep
) -> PointResolution:
    return await service.resolve_point(session, latitude=latitude, longitude=longitude)


@public_router.get(
    "/area-boundaries",
    summary="Area boundary polygons as GeoJSON FeatureCollection (FR-MAP-001)",
)
async def public_area_boundaries(session: DbSessionDep) -> AreaBoundaryCollection:
    """Separate from /public/areas — that returns names/stats; this returns geometry.

    An empty feature list is valid: boundaries may not yet be loaded. The
    frontend map degrades gracefully on an empty collection (same principle
    as the hazard layer 404 handling).
    """
    return await service.list_area_boundaries(session)


@public_router.get("/sirens", summary="Siren units with status (FR-MAP-014)")
async def public_sirens(session: DbSessionDep) -> list[PublicSiren]:
    rows = await service.list_sirens(session, active_only=True)
    return [service.siren_to_public(siren, coords) for siren, coords, _ in rows]


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
    dependencies=[Depends(require_role("admin"))],
    summary="List facilities (admin)",
)
async def admin_list_facilities(session: DbSessionDep):
    return await service.list_admin_facilities(session)


@admin_router.get(
    "/facilities/{facility_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Get a facility",
)
async def admin_get_facility(facility_id: uuid.UUID, session: DbSessionDep) -> FacilityOut:
    facility = await service.get_facility_or_404(session, facility_id)
    return await service.facility_out(session, facility)


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
    return {"ok": True, "deactivated": True}


@admin_router.post(
    "/facilities/{facility_id}/reactivate",
    dependencies=[Depends(require_role("admin"))],
    summary="Reactivate a facility",
)
async def admin_reactivate_facility(
    facility_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> FacilityOut:
    facility = await service.reactivate_facility(session, facility_id, actor_id=user.id)
    return await service.facility_out(session, facility)


@admin_router.get(
    "/areas",
    dependencies=[Depends(require_role("admin"))],
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


@admin_router.get(
    "/sirens",
    dependencies=[Depends(require_role("admin"))],
    summary="List sirens (admin)",
)
async def admin_list_sirens(session: DbSessionDep) -> list[SirenOut]:
    rows = await service.list_sirens(session)
    return [service.siren_to_out(siren, coords, area_name) for siren, coords, area_name in rows]


@admin_router.get(
    "/sirens/{siren_id}", dependencies=[Depends(require_role("admin"))], summary="Get a siren"
)
async def admin_get_siren(siren_id: uuid.UUID, session: DbSessionDep) -> SirenOut:
    siren = await service.get_siren_or_404(session, siren_id)
    coords = await service.siren_coordinates(session, siren.id)
    area_name = await service.siren_area_name(session, siren.area_id)
    return service.siren_to_out(siren, coords, area_name)


@admin_router.post("/sirens", dependencies=[Depends(require_role("admin"))], summary="Add a siren")
async def admin_create_siren(body: SirenIn, session: DbSessionDep, user: CurrentUser) -> SirenOut:
    siren, coords = await service.create_siren(session, body, actor_id=user.id)
    return service.siren_to_out(
        siren, coords, await service.siren_area_name(session, siren.area_id)
    )


@admin_router.patch(
    "/sirens/{siren_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Update a siren",
)
async def admin_update_siren(
    siren_id: uuid.UUID, body: SirenIn, session: DbSessionDep, user: CurrentUser
) -> SirenOut:
    siren, coords = await service.update_siren(session, siren_id, body, actor_id=user.id)
    return service.siren_to_out(
        siren, coords, await service.siren_area_name(session, siren.area_id)
    )


@admin_router.post(
    "/sirens/drill/trigger",
    dependencies=[Depends(require_role("admin"))],
    summary="Trigger all sirens for emergency drill simulation",
)
async def admin_trigger_all_sirens_drill(
    session: DbSessionDep, user: CurrentUser
) -> SirenDrillResult:
    results = await service.trigger_all_sirens_drill(session, actor_id=user.id)
    sirens_out = [service.siren_to_out(s, coords, area_name) for s, coords, area_name in results]
    return SirenDrillResult(
        ok=True,
        action="siren.drill",
        classification="Drill",
        affected_count=len(sirens_out),
        sirens=sirens_out,
    )


@admin_router.post(
    "/sirens/drill/silence",
    dependencies=[Depends(require_role("admin"))],
    summary="Silence all sirens from emergency drill simulation",
)
async def admin_silence_all_sirens_drill(
    session: DbSessionDep, user: CurrentUser
) -> SirenDrillResult:
    results = await service.silence_all_sirens_drill(session, actor_id=user.id)
    sirens_out = [service.siren_to_out(s, coords, area_name) for s, coords, area_name in results]
    return SirenDrillResult(
        ok=True,
        action="siren.drill_silence",
        classification="Drill",
        affected_count=len(sirens_out),
        sirens=sirens_out,
    )


@admin_router.get(
    "/sirens/audits",
    dependencies=[Depends(require_role("admin"))],
    summary="List siren drill and trigger audit logs",
)
async def admin_list_siren_audits(session: DbSessionDep) -> list[SirenAuditOut]:
    return await service.list_siren_audits(session)


@admin_router.get(
    "/sirens/{siren_id}/audits",
    dependencies=[Depends(require_role("admin"))],
    summary="List audits for a specific siren unit",
)
async def admin_get_siren_audits(
    siren_id: uuid.UUID, session: DbSessionDep
) -> list[SirenAuditOut]:
    return await service.list_siren_audits(session, siren_id=siren_id)


@admin_router.post(
    "/sirens/{siren_id}/trigger",
    dependencies=[Depends(require_role("admin"))],
    summary="Trigger/toggle siren status (simulation)",
)
async def admin_trigger_siren(
    siren_id: uuid.UUID, session: DbSessionDep, user: CurrentUser, is_drill: bool = False
) -> SirenOut:
    siren, coords = await service.trigger_siren(
        session, siren_id, actor_id=user.id, is_drill=is_drill
    )
    return service.siren_to_out(
        siren, coords, await service.siren_area_name(session, siren.area_id)
    )


@admin_router.post(
    "/sirens/{siren_id}/silence",
    dependencies=[Depends(require_role("admin"))],
    summary="Silence a siren simulation",
)
async def admin_silence_siren(
    siren_id: uuid.UUID, session: DbSessionDep, user: CurrentUser, is_drill: bool = False
) -> SirenOut:
    siren, coords = await service.silence_siren(
        session, siren_id, actor_id=user.id, is_drill=is_drill
    )
    return service.siren_to_out(
        siren, coords, await service.siren_area_name(session, siren.area_id)
    )


@admin_router.post(
    "/sirens/{siren_id}/deactivate",
    dependencies=[Depends(require_role("admin"))],
    summary="Deactivate/disable a siren unit",
)
async def admin_deactivate_siren(
    siren_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> SirenOut:
    siren, coords = await service.deactivate_siren(session, siren_id, actor_id=user.id)
    return service.siren_to_out(
        siren, coords, await service.siren_area_name(session, siren.area_id)
    )


@admin_router.post(
    "/sirens/{siren_id}/reactivate",
    dependencies=[Depends(require_role("admin"))],
    summary="Reactivate a siren",
)
async def admin_reactivate_siren(
    siren_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> SirenOut:
    siren, coords = await service.reactivate_siren(session, siren_id, actor_id=user.id)
    return service.siren_to_out(
        siren, coords, await service.siren_area_name(session, siren.area_id)
    )


@admin_router.delete(
    "/sirens/{siren_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Soft-delete a siren unit",
)
async def admin_delete_siren(
    siren_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.delete_siren(session, siren_id, actor_id=user.id)
    return {"ok": True, "deleted": True}
