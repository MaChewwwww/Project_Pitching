"""The active demo seed is a deliberate, internally consistent exercise story."""

from __future__ import annotations

import pytest
from sqlalchemy import func, select

from src.modules.evacuation.models import EmergencyEvent, EvacCheckin
from src.modules.geo.models import Area, Siren
from src.modules.registry.models import Household, Member
from src.modules.safety.models import (
    IncidentReport,
    RescueRequest,
    SafetyStatus,
    UnregisteredPerson,
)
from src.modules.users.models import User
from src.modules.weather.models import FloodEvent, FloodEventArea
from src.seed import DEMO_SCENARIO_NAME

HISTORICAL_EVENT_NAMES = (
    "Typhoon Ondoy (Ketsana)",
    "Typhoon Ulysses (Vamco)",
    "Habagat and Tropical Storm Crising",
)


async def _count(session, model, *where) -> int:
    return int(await session.scalar(select(func.count()).select_from(model).where(*where)) or 0)


async def _status_counts(session, *, event_id, registered: bool) -> dict[str, int]:
    subject = SafetyStatus.member_id if registered else SafetyStatus.unregistered_person_id
    rows = await session.execute(
        select(SafetyStatus.status, func.count())
        .where(
            SafetyStatus.event_id == event_id,
            subject.is_not(None),
            SafetyStatus.superseded_at.is_(None),
        )
        .group_by(SafetyStatus.status)
    )
    return dict(rows.all())


@pytest.mark.seeded_demo
async def test_demo_seed_story_integrity(session) -> None:
    """Exercise records are complete, while unsupported historical fields stay absent."""

    events = {
        event.name: event
        for event in (await session.execute(select(EmergencyEvent))).scalars().all()
    }
    scenario = events[DEMO_SCENARIO_NAME]
    assert scenario.is_active is True
    assert scenario.ended_at is None

    for name in HISTORICAL_EVENT_NAMES:
        assert events[name].is_active is False
        assert events[name].ended_at is not None

    flood_events = {
        event.name: event for event in (await session.execute(select(FloodEvent))).scalars().all()
    }
    assert set(flood_events) == {*HISTORICAL_EVENT_NAMES, DEMO_SCENARIO_NAME}
    for name in HISTORICAL_EVENT_NAMES:
        history = flood_events[name]
        assert history.emergency_event_id == events[name].id
        assert history.peak_level_m is None
        assert history.peak_at is None
        assert history.households_displaced is None
        assert (
            await _count(session, FloodEventArea, FloodEventArea.flood_event_id == history.id) == 0
        )

    exercise_history = flood_events[DEMO_SCENARIO_NAME]
    assert exercise_history.emergency_event_id == scenario.id
    assert float(exercise_history.peak_level_m) == 23.8
    assert exercise_history.households_displaced == 58
    assert "DEMO SIMULATION" in (exercise_history.notes or "")
    exercise_area_names = set(
        (
            await session.execute(
                select(Area.name)
                .join(FloodEventArea, FloodEventArea.area_id == Area.id)
                .where(FloodEventArea.flood_event_id == exercise_history.id)
            )
        ).scalars()
    )
    assert exercise_area_names == {"Area 1", "Area 2", "Area 4"}

    assert await _count(session, Household, Household.source == "bhw") == 1_000
    assert await _count(session, Member) == 3_820
    assert await _count(session, Household, Household.location.is_not(None)) == 850
    assert await _count(session, Household, Household.location.is_(None)) == 150
    distinct_pins = await session.scalar(
        select(func.count(func.distinct(func.ST_AsEWKB(Household.location)))).where(
            Household.location.is_not(None)
        )
    )
    assert distinct_pins == 850
    pins_outside_assigned_area = await session.scalar(
        select(func.count())
        .select_from(Household)
        .join(Area, Household.area_id == Area.id)
        .where(
            Household.location.is_not(None),
            func.ST_Contains(Area.geom, Household.location).is_(False),
        )
    )
    assert pins_outside_assigned_area == 0
    head = await session.scalar(select(User).where(User.role == "head"))
    assert head is not None
    assert await _count(session, Household, Household.head_user_id == head.id) == 1

    sirens = (await session.execute(select(Siren))).scalars().all()
    assert len(sirens) == 9
    assert all(siren.name.startswith("SAGIP-SJ Demo Simulation") for siren in sirens)
    assert sum(siren.status == "sounding" for siren in sirens) == 3
    assert {siren.status for siren in sirens} <= {"idle", "sounding"}

    registered_counts = await _status_counts(session, event_id=scenario.id, registered=True)
    assert registered_counts == {"safe": 420, "needs_rescue": 12}
    assert sum(registered_counts.values()) == 432
    assert await _count(
        session,
        SafetyStatus,
        SafetyStatus.event_id == scenario.id,
        SafetyStatus.member_id.is_not(None),
        SafetyStatus.superseded_at.is_(None),
    ) == await session.scalar(
        select(func.count(func.distinct(SafetyStatus.member_id))).where(
            SafetyStatus.event_id == scenario.id,
            SafetyStatus.member_id.is_not(None),
            SafetyStatus.superseded_at.is_(None),
        )
    )

    assert (
        await _count(session, UnregisteredPerson, UnregisteredPerson.event_id == scenario.id) == 12
    )
    unregistered_counts = await _status_counts(session, event_id=scenario.id, registered=False)
    assert unregistered_counts == {"safe": 8, "needs_rescue": 4}
    assert sum(unregistered_counts.values()) == 12

    rescue_rows = (
        (await session.execute(select(RescueRequest).where(RescueRequest.event_id == scenario.id)))
        .scalars()
        .all()
    )
    assert len(rescue_rows) == 18
    assert {
        status: sum(row.status == status for row in rescue_rows)
        for status in {"pending", "verified", "dispatched", "resolved", "dismissed"}
    } == {"pending": 3, "verified": 3, "dispatched": 4, "resolved": 6, "dismissed": 2}
    for request in rescue_rows:
        assert request.created_at <= request.updated_at
        if request.status in {"resolved", "dismissed"}:
            assert request.resolved_at is not None
            assert request.resolution_note
        if request.status in {"dispatched", "resolved"}:
            assert request.assigned_to_user_id is not None

    incidents = (
        (
            await session.execute(
                select(IncidentReport).where(IncidentReport.event_id == scenario.id)
            )
        )
        .scalars()
        .all()
    )
    assert len(incidents) == 14
    assert all(report.photo_path is None for report in incidents)
    assert {
        status: sum(report.status == status for report in incidents)
        for status in {"pending", "verified", "in_progress", "resolved", "dismissed"}
    } == {"pending": 4, "verified": 3, "in_progress": 3, "resolved": 3, "dismissed": 1}
    for report in incidents:
        assert report.created_at <= report.updated_at
        if report.status in {"verified", "in_progress", "resolved"}:
            assert report.verified_by_user_id is not None
            assert report.verified_at is not None
        if report.status == "resolved":
            assert report.resolved_at is not None
            assert report.resolution_note
        if report.status == "dismissed":
            assert report.dismissal_reason

    assert await _count(session, EvacCheckin) == 0
