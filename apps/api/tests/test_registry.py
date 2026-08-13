"""FR-REG-002/005 — BHW household contact status is derived on write."""

from __future__ import annotations

import uuid

import pytest
from factories import get_area
from pydantic import ValidationError

from src.core.deps import AuthenticatedUser
from src.modules.registry import service
from src.modules.registry.schemas import HouseholdCreateBhw, MemberIn


def _actor(user) -> AuthenticatedUser:
    return AuthenticatedUser(id=user.id, role=user.role)


def _body(*, area_id, contact_number: str | None) -> HouseholdCreateBhw:
    head = MemberIn(full_name="BHW Contact Test Head")
    return HouseholdCreateBhw(
        head_name=head.full_name,
        contact_number=contact_number,
        area_id=area_id,
        street_address="12 Sampaguita St., Greenview Subdivision",
        latitude=14.735593,
        longitude=121.130018,
        head_member=head,
    )


def test_bhw_creation_requires_address_and_map_pin():
    with pytest.raises(ValidationError) as exc_info:
        HouseholdCreateBhw(
            head_name="BHW Required Fields Test",
            area_id=uuid.uuid4(),
            head_member=MemberIn(full_name="BHW Required Fields Test"),
        )

    assert {error["loc"][0] for error in exc_info.value.errors()} == {
        "street_address",
        "latitude",
        "longitude",
    }


def test_bhw_member_requires_birth_date_and_relationship():
    with pytest.raises(ValidationError, match=r"members\[0\].birth_date is required"):
        HouseholdCreateBhw(
            head_name="BHW Member Required Test",
            area_id=uuid.uuid4(),
            street_address="12 Sampaguita St.",
            latitude=14.735593,
            longitude=121.130018,
            head_member=MemberIn(full_name="BHW Member Required Test"),
            members=[MemberIn(full_name="Other Member")],
        )


async def test_bhw_creation_derives_missing_contact_as_unreachable(session, demo_users):
    area = await get_area(session)
    result = await service.create_household_bhw(
        session,
        user=_actor(demo_users["admin"]),
        body=_body(area_id=area.id, contact_number="  "),
    )

    assert result.household.contact_number is None
    assert result.household.is_unreachable_by_phone is True


async def test_bhw_creation_keeps_contact_reachable_when_number_is_present(session, demo_users):
    area = await get_area(session)
    result = await service.create_household_bhw(
        session,
        user=_actor(demo_users["admin"]),
        body=_body(area_id=area.id, contact_number=" 0917 000 0000 "),
    )

    assert result.household.contact_number == "0917 000 0000"
    assert result.household.is_unreachable_by_phone is False
