"""FR-REG-002/005 — BHW household contact status is derived on write."""

from __future__ import annotations

import uuid

import pytest
from factories import get_area, make_household
from pydantic import ValidationError
from sqlalchemy import func

from src.core.deps import AuthenticatedUser
from src.modules.registry import service
from src.modules.registry.schemas import (
    AdminMemberCreate,
    AdminMemberUpdate,
    HouseholdCreateBhw,
    MemberIn,
    MemberPromoteIn,
)


def _actor(user) -> AuthenticatedUser:
    return AuthenticatedUser(id=user.id, role=user.role)


def _body(*, area_id, contact_number: str | None) -> HouseholdCreateBhw:
    head = MemberIn(
        full_name="BHW Contact Test Head",
        birth_date="1985-01-01",
        sex="female",
    )
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
            head_member=MemberIn(
                full_name="BHW Required Fields Test",
                birth_date="1985-01-01",
                sex="female",
            ),
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
            head_member=MemberIn(
                full_name="BHW Member Required Test",
                birth_date="1985-01-01",
                sex="female",
            ),
            members=[MemberIn(full_name="Other Member")],
        )


def test_bhw_member_requires_sex():
    with pytest.raises(ValidationError, match=r"members\[0\].sex is required"):
        HouseholdCreateBhw(
            head_name="BHW Member Sex Test",
            area_id=uuid.uuid4(),
            street_address="12 Sampaguita St.",
            latitude=14.735593,
            longitude=121.130018,
            head_member=MemberIn(
                full_name="BHW Member Sex Test",
                birth_date="1985-01-01",
                sex="female",
            ),
            members=[
                MemberIn(
                    full_name="Other Member",
                    birth_date="2000-01-01",
                    relationship_to_head="Child",
                )
            ],
        )


def test_bhw_member_optional_contact_is_normalized():
    member = service._new_member(
        MemberIn(
            full_name="Other Member",
            birth_date="2000-01-01",
            sex="female",
            contact_number=" 0917 000 0000 ",
            relationship_to_head="Child",
        ),
        household_id=uuid.uuid4(),
        is_head=False,
        derive_age_from_birthdate=False,
    )

    assert member.contact_number == "0917 000 0000"


def test_bhw_head_requires_birth_date_and_sex():
    with pytest.raises(ValidationError, match=r"head_member.birth_date is required"):
        HouseholdCreateBhw(
            head_name="BHW Head Required Test",
            area_id=uuid.uuid4(),
            street_address="12 Sampaguita St.",
            latitude=14.735593,
            longitude=121.130018,
            head_member=MemberIn(full_name="BHW Head Required Test", sex="female"),
        )

    with pytest.raises(ValidationError, match=r"head_member.sex is required"):
        HouseholdCreateBhw(
            head_name="BHW Head Sex Required Test",
            area_id=uuid.uuid4(),
            street_address="12 Sampaguita St.",
            latitude=14.735593,
            longitude=121.130018,
            head_member=MemberIn(
                full_name="BHW Head Sex Required Test",
                birth_date="1985-01-01",
            ),
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


def test_admin_citizen_create_and_update_require_complete_profile():
    with pytest.raises(ValidationError):
        AdminMemberCreate(full_name="Incomplete", relationship_to_head="Child")
    with pytest.raises(ValidationError):
        AdminMemberUpdate(full_name="Incomplete")


async def test_citizen_summary_detail_and_empty_activity_are_area_scoped(session, demo_users):
    area = await get_area(session)
    actor = _actor(demo_users["admin"])
    created = await service.create_household_bhw(
        session, user=actor, body=_body(area_id=area.id, contact_number=None)
    )
    detail = await service.get_member(session, member_id=created.members[0].id, user=actor)
    summary = await service.get_member_summary(session, user=actor)
    activity = await service.get_member_activity(
        session, member_id=created.members[0].id, user=actor
    )

    assert detail.household.id == created.household.id
    assert detail.updated_at is not None
    assert summary.citizens >= 1
    assert summary.household_heads >= 1
    assert any(item.id == area.id for item in summary.areas)
    assert activity.safety is None
    assert activity.evacuations == []
    assert activity.household_rescues == []
    assert activity.household_reports == []


async def test_household_list_keeps_pinned_and_pending_locations(session, demo_users):
    area = await get_area(session)
    pinned = await make_household(
        session,
        area=area,
        location=func.ST_SetSRID(func.ST_MakePoint(121.1315, 14.7415), 4326),
    )
    pending = await make_household(session, area=area, location=None)

    page = await service.list_households(
        session, user=_actor(demo_users["admin"]), page=1, size=2000
    )
    rows = {row.id: row for row in page.items}

    assert rows[pinned.id].location == {"type": "Point", "coordinates": [121.1315, 14.7415]}
    assert rows[pending.id].location is None


async def test_registry_summary_groups_area_metrics_and_duplicate_flags(session, demo_users):
    area = await get_area(session)
    await make_household(session, area=area, head_name="Summary Duplicate", source="bhw")
    await make_household(session, area=area, head_name="Summary Duplicate", source="self")

    summary = await service.get_registry_summary(session, user=_actor(demo_users["admin"]))
    area_summary = next(row for row in summary.areas if row["id"] == area.id)

    assert summary.households >= 2
    assert summary.citizens >= 2
    assert summary.possible_duplicates >= 2
    assert area_summary["households"] >= 2
    assert area_summary["citizens"] >= 2


async def test_adult_promotion_preserves_member_identity_and_derives_no_contact(
    session, demo_users
):
    area = await get_area(session)
    actor = _actor(demo_users["admin"])
    source = await service.create_household_bhw(
        session, user=actor, body=_body(area_id=area.id, contact_number="09170000000")
    )
    member = await service.add_member(
        session,
        household_id=source.household.id,
        body=AdminMemberCreate(
            full_name="Promotion Test Adult",
            birth_date="1990-01-01",
            sex="male",
            relationship_to_head="Sibling",
        ),
        actor=actor,
    )
    promoted = await service.promote_member(
        session,
        member_id=member.id,
        actor=actor,
        body=MemberPromoteIn(
            area_id=area.id,
            street_address="12 Sampaguita St., Greenview Subdivision",
            waterway_proximity="near",
            latitude=14.735593,
            longitude=121.130018,
        ),
    )

    assert promoted.members[0].id == member.id
    assert promoted.members[0].is_head is True
    assert promoted.is_unreachable_by_phone is True
