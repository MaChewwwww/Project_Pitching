"""Minimal row builders for tests.

Not a full factory library — just enough to get a valid `Household`/`Member`/
`EmergencyEvent` row into the test transaction without every test hand-rolling
the required columns. Callers pass `session` explicitly (the `session` fixture
in `conftest.py`); these are plain functions, not fixtures, so a test can build
several rows with different shapes in one test.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.evacuation.models import EmergencyEvent
from src.modules.geo.models import Area
from src.modules.registry.models import Household, Member


async def get_area(session: AsyncSession, *, name: str = "Area 1") -> Area:
    return (await session.execute(select(Area).where(Area.name == name))).scalar_one()


async def make_member(
    session: AsyncSession, *, household_id: uuid.UUID, is_head: bool = False, **overrides
) -> Member:
    member = Member(
        household_id=household_id,
        full_name=overrides.pop("full_name", "Test Member" if not is_head else "Test Head"),
        is_head=is_head,
        **overrides,
    )
    session.add(member)
    await session.flush()
    return member


async def make_household(
    session: AsyncSession,
    *,
    area: Area,
    source: str = "bhw",
    member_count: int = 1,
    **overrides,
) -> Household:
    """`member_count` includes the head. Always creates exactly one head member —
    `idx_member_one_head` means a test that needs zero or two heads builds its
    own members with `make_member` instead of asking for that here."""
    household = Household(
        reference_no=f"HH-TEST-{uuid.uuid4().hex[:8]}",
        head_name=overrides.pop("head_name", "Test Head"),
        area_id=area.id,
        source=source,
        verified_at=overrides.pop("verified_at", datetime.now(UTC)),
        **overrides,
    )
    session.add(household)
    await session.flush()

    await make_member(
        session, household_id=household.id, is_head=True, full_name=household.head_name
    )
    for i in range(1, member_count):
        await make_member(session, household_id=household.id, full_name=f"Test Member {i}")

    return household


async def make_event(session: AsyncSession, *, active: bool = True, **overrides) -> EmergencyEvent:
    event = EmergencyEvent(
        name=overrides.pop("name", "Test Event"),
        type=overrides.pop("type", "flood"),
        started_at=overrides.pop("started_at", datetime.now(UTC)),
        is_active=active,
        **overrides,
    )
    session.add(event)
    await session.flush()
    return event
