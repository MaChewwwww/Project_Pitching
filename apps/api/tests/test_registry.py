"""FR-REG-002/005 — BHW household contact status is derived on write."""

from __future__ import annotations

from factories import get_area

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
        head_member=head,
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
