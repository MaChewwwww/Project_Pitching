"""FR-SAF-015/016 — incident reports and their review.

`dismissal_reason` is enforced twice, deliberately: once by
`IncidentReportPatch`'s own validator (422, the normal path) and once by
the database CHECK (belt and braces — the second test proves the CHECK is
real, not just documented, by bypassing the schema entirely).
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from src.core.deps import AuthenticatedUser
from src.modules.safety import service
from src.modules.safety.models import IncidentReport
from src.modules.safety.schemas import IncidentReportIn, IncidentReportPatch


def _actor(user) -> AuthenticatedUser:
    return AuthenticatedUser(id=user.id, role=user.role)


async def test_dismissing_without_a_reason_is_rejected_by_the_schema():
    with pytest.raises(ValidationError):
        IncidentReportPatch(status="dismissed")


async def test_dismissing_without_a_reason_is_also_rejected_by_the_database(session):
    """Bypasses `IncidentReportPatch` entirely — a direct insert proves the
    CHECK constraint itself is load-bearing, not just documented."""
    session.add(
        IncidentReport(
            type="flooding",
            description="Testing the raw constraint",
            status="dismissed",
            dismissal_reason=None,
        )
    )
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_create_report_with_no_photo(session, demo_users):
    admin = _actor(demo_users["admin"])
    body = IncidentReportIn(
        type="fallen_tree",
        description="A tree is blocking Riverside Road",
        location_note="Near Purok 3",
    )
    out = await service.create_incident_report(session, body=body, photo=None, actor=admin, ip=None)
    assert out.status == "pending"
    assert out.photo_url is None


async def test_photo_url_has_the_uploads_prefix(session, demo_users, monkeypatch, tmp_path):
    import io

    from fastapi import UploadFile

    from src.core import uploads as uploads_module

    monkeypatch.setattr(uploads_module.settings, "upload_dir", str(tmp_path))
    admin = _actor(demo_users["admin"])
    body = IncidentReportIn(type="fire", description="Small fire near the market")
    jpeg = UploadFile(io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00" * 50), filename="fire.jpg")

    out = await service.create_incident_report(session, body=body, photo=jpeg, actor=admin, ip=None)
    assert out.photo_url is not None
    assert out.photo_url.startswith("/uploads/")


async def test_verifying_sets_the_reviewer_and_timestamp(session, demo_users):
    admin = _actor(demo_users["admin"])
    created = await service.create_incident_report(
        session,
        body=IncidentReportIn(type="power_outage", description="No power since noon"),
        photo=None,
        actor=admin,
        ip=None,
    )
    updated = await service.review_incident_report(
        session,
        created.id,
        body=IncidentReportPatch(status="verified"),
        actor=admin,
        ip=None,
    )
    assert updated.status == "verified"
    assert updated.verified_by_name is not None
    assert updated.verified_at is not None


async def test_dismissing_with_a_reason_succeeds(session, demo_users):
    admin = _actor(demo_users["admin"])
    created = await service.create_incident_report(
        session,
        body=IncidentReportIn(type="other", description="Not a real incident"),
        photo=None,
        actor=admin,
        ip=None,
    )
    updated = await service.review_incident_report(
        session,
        created.id,
        body=IncidentReportPatch(status="dismissed", dismissal_reason="Duplicate report"),
        actor=admin,
        ip=None,
    )
    assert updated.status == "dismissed"
    assert updated.dismissal_reason == "Duplicate report"


async def test_resolving_requires_a_note_in_the_schema():
    with pytest.raises(ValidationError):
        IncidentReportPatch(status="resolved")


async def test_incident_moves_through_the_action_lifecycle(session, demo_users):
    admin = _actor(demo_users["admin"])
    created = await service.create_incident_report(
        session,
        body=IncidentReportIn(type="road_blockage", description="One lane is blocked"),
        photo=None,
        actor=admin,
        ip=None,
    )
    verified = await service.review_incident_report(
        session, created.id, body=IncidentReportPatch(status="verified"), actor=admin, ip=None
    )
    in_progress = await service.review_incident_report(
        session,
        created.id,
        body=IncidentReportPatch(status="in_progress"),
        actor=admin,
        ip=None,
    )
    resolved = await service.review_incident_report(
        session,
        created.id,
        body=IncidentReportPatch(
            status="resolved", resolution_note="Debris removed and lane checked."
        ),
        actor=admin,
        ip=None,
    )
    assert verified.status == "verified"
    assert in_progress.status == "in_progress"
    assert resolved.status == "resolved"
    assert resolved.resolution_note == "Debris removed and lane checked."
    assert resolved.resolved_at is not None


async def test_incident_list_projects_batched_related_metadata(session, demo_users):
    admin = _actor(demo_users["admin"])
    created = await service.create_incident_report(
        session,
        body=IncidentReportIn(type="flooding", description="Batch projection test"),
        photo=None,
        actor=admin,
        ip=None,
    )

    page = await service.list_incident_reports(session, size=100)
    result = next(item for item in page.items if item.id == created.id)
    assert result.reported_by_name is not None
    assert result.event_id == created.event_id
