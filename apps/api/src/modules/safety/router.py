"""HTTP surface for the safety module (FR-SAF-*).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.

Split into the three-tier convention every other module uses —
`public_router`/`me_router`/`admin_router`, no prefixes of their own
(`main.py` supplies `/public`, `/me`, `/admin`). The stub this replaced was a
single `router = APIRouter(prefix="/safety")`, the wrong shape.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from src.core.deps import CurrentUser, require_role
from src.core.pagination import Page
from src.core.rate_limit import limiter
from src.db.session import DbSessionDep
from src.modules.evacuation import service as evacuation_service
from src.modules.safety import service
from src.modules.safety.schemas import (
    AccountedForOut,
    HouseholdSafetyOut,
    IncidentReportIn,
    IncidentReportOut,
    IncidentReportReview,
    IncidentStatus,
    IncidentType,
    MySafetyOut,
    RescueRequestAck,
    RescueRequestOut,
    RescueRequestPatch,
    RescueRequestPublicIn,
    RescueRequestStatus,
    SafetyStatusAdminIn,
    SafetyStatusSelfIn,
    UnregisteredPersonIn,
    UnregisteredPersonOut,
    UnregisteredPersonPatch,
)

public_router = APIRouter(tags=["safety"])
me_router = APIRouter(tags=["safety"])
admin_router = APIRouter(tags=["safety"])


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@public_router.post(
    "/rescue-requests",
    status_code=201,
    summary="Ask for rescue — no account needed (FR-SAF-009)",
)
@limiter.limit("60/minute")  # architecture.md R-11 — a false positive turns away a real emergency
async def public_rescue_request(
    request: Request, body: RescueRequestPublicIn, session: DbSessionDep
) -> RescueRequestAck:
    return await service.create_public_rescue_request(
        session, body=body, source_ip=_client_ip(request)
    )


@me_router.get("/safety", summary="My household's safety status for the active event")
async def my_safety(session: DbSessionDep, user: CurrentUser) -> MySafetyOut:
    return await service.get_my_safety(session, user=user)


@me_router.post(
    "/safety-status",
    dependencies=[Depends(require_role("head"))],
    summary="Check in myself or my whole household (FR-SAF-001/002)",
)
async def submit_my_safety_status(
    body: SafetyStatusSelfIn, request: Request, session: DbSessionDep, user: CurrentUser
) -> HouseholdSafetyOut:
    event = await evacuation_service.require_active_event(session)
    return await service.submit_self_status(
        session, event=event, user=user, body=body, ip=_client_ip(request)
    )


@admin_router.get(
    "/households/{household_id}/safety",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="A household's current safety status (admin/BHW view)",
)
async def admin_household_safety(
    household_id: uuid.UUID, session: DbSessionDep
) -> HouseholdSafetyOut:
    event = await evacuation_service.require_active_event(session)
    return await service.get_household_safety(session, event=event, household_id=household_id)


@admin_router.post(
    "/safety-status",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Assisted check-in — member, household, or unregistered person",
)
async def admin_submit_safety_status(
    body: SafetyStatusAdminIn, request: Request, session: DbSessionDep, user: CurrentUser
) -> HouseholdSafetyOut | None:
    event = await evacuation_service.require_active_event(session)
    return await service.submit_admin_status(
        session, event=event, actor=user, body=body, ip=_client_ip(request)
    )


@admin_router.get(
    "/accounted-for",
    dependencies=[Depends(require_role("admin", "bhw", "sk"))],
    summary="Live registered accounted-for vs. unaccounted, by area (FR-SAF-011)",
)
async def admin_accounted_for(
    session: DbSessionDep, user: CurrentUser, event_id: uuid.UUID | None = None
) -> AccountedForOut:
    event = (
        await evacuation_service.get_event_or_404(session, event_id)
        if event_id is not None
        else await evacuation_service.require_active_event(session)
    )
    return await service.accounted_for_summary(session, event=event, user=user)


@admin_router.get(
    "/rescue-requests/open-count",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Count of pending/verified/dispatched requests, for the dashboard tile",
)
async def admin_open_rescue_count(session: DbSessionDep) -> dict[str, int]:
    return {"count": await service.open_rescue_count(session)}


@admin_router.get(
    "/rescue-requests",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="The rescue queue, triaged by urgency (FR-SAF-010)",
)
async def admin_list_rescue_requests(
    session: DbSessionDep,
    status: RescueRequestStatus | None = None,
    page: int = 1,
    size: int = 20,
) -> Page[RescueRequestOut]:
    # Not area-scoped — see the docstring on service.list_rescue_requests.
    return await service.list_rescue_requests(session, status=status, page=page, size=size)


@admin_router.patch(
    "/rescue-requests/{request_id}",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Triage a rescue request — status, assignment, priority override",
)
async def admin_update_rescue_request(
    request_id: uuid.UUID,
    body: RescueRequestPatch,
    request: Request,
    session: DbSessionDep,
    user: CurrentUser,
) -> RescueRequestOut:
    return await service.update_rescue_request(
        session, request_id, body=body, actor=user, ip=_client_ip(request)
    )


@admin_router.get(
    "/unregistered-persons",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Unregistered persons recorded for an event (FR-SAF-012)",
)
async def admin_list_unregistered(
    session: DbSessionDep,
    event_id: uuid.UUID | None = None,
    page: int = 1,
    size: int = 20,
) -> Page[UnregisteredPersonOut]:
    return await service.list_unregistered(session, event_id=event_id, page=page, size=size)


@admin_router.post(
    "/unregistered-persons",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Record an unregistered person safe or needing rescue (FR-SAF-012)",
)
async def admin_create_unregistered(
    body: UnregisteredPersonIn, request: Request, session: DbSessionDep, user: CurrentUser
) -> UnregisteredPersonOut:
    return await service.create_unregistered(session, body=body, actor=user, ip=_client_ip(request))


@admin_router.patch(
    "/unregistered-persons/{unregistered_id}",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Edit an unregistered person's recorded details",
)
async def admin_update_unregistered(
    unregistered_id: uuid.UUID,
    body: UnregisteredPersonPatch,
    request: Request,
    session: DbSessionDep,
    user: CurrentUser,
) -> UnregisteredPersonOut:
    return await service.update_unregistered(
        session, unregistered_id, body=body, actor=user, ip=_client_ip(request)
    )


@me_router.post(
    "/incident-reports",
    summary="Report an incident (FR-SAF-015)",
)
@limiter.limit("10/minute")
async def me_create_incident_report(
    request: Request,
    session: DbSessionDep,
    user: CurrentUser,
    # FastAPI's multipart parsing requires Form(...)/File(...) as literal
    # default values — this is the documented pattern, not an oversight.
    type: IncidentType = Form(...),  # noqa: B008
    description: str = Form(...),  # noqa: B008
    latitude: float | None = Form(default=None),  # noqa: B008
    longitude: float | None = Form(default=None),  # noqa: B008
    location_note: str | None = Form(default=None),  # noqa: B008
    photo: UploadFile | None = File(default=None),  # noqa: B008
) -> IncidentReportOut:
    body = IncidentReportIn(
        type=type,
        description=description,
        latitude=latitude,
        longitude=longitude,
        location_note=location_note,
    )
    return await service.create_incident_report(
        session, body=body, photo=photo, actor=user, ip=_client_ip(request)
    )


@admin_router.get(
    "/incident-reports",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Incident reports awaiting review (FR-SAF-016)",
)
async def admin_list_incident_reports(
    session: DbSessionDep,
    status: IncidentStatus | None = None,
    page: int = 1,
    size: int = 20,
) -> Page[IncidentReportOut]:
    return await service.list_incident_reports(session, status=status, page=page, size=size)


@admin_router.patch(
    "/incident-reports/{report_id}",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Verify or dismiss an incident report, with reason (FR-SAF-016)",
)
async def admin_review_incident_report(
    report_id: uuid.UUID,
    body: IncidentReportReview,
    request: Request,
    session: DbSessionDep,
    user: CurrentUser,
) -> IncidentReportOut:
    return await service.review_incident_report(
        session, report_id, body=body, actor=user, ip=_client_ip(request)
    )
