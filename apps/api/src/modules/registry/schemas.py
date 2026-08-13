"""Pydantic request/response models for the registry module (FR-REG-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from src.modules.geo.schemas import GeoJsonPoint

MEMBER_RELATIONSHIPS_NOTE = "Free text — e.g. 'Spouse', 'Child', 'Parent'."


class MemberIn(BaseModel):
    """One household member, used both for the BHW repeater and (as a single
    instance) the self-registration head's own profile."""

    full_name: str = Field(min_length=1)
    birth_date: date | None = None
    sex: Literal["male", "female"] | None = None
    relationship_to_head: str | None = None
    is_child: bool = False
    is_senior: bool = False
    is_pwd: bool = False
    is_pregnant: bool = False
    is_lactating: bool = False
    has_chronic_condition: bool = False
    chronic_condition_note: str | None = None
    is_bedridden: bool = False


class HeadMemberIn(BaseModel):
    """The self-registering head's own profile at onboarding — no `full_name` or
    `relationship_to_head`: those come from the account (name) or are moot
    (head has no relationship to themself). `is_child`/`is_senior` are derived
    server-side from `birth_date`, not asked — an adult signing up for their own
    account always knows it, unlike a BHW profiling someone else."""

    birth_date: date | None = None
    sex: Literal["male", "female"] | None = None
    is_pwd: bool = False
    is_pregnant: bool = False
    is_lactating: bool = False
    has_chronic_condition: bool = False
    chronic_condition_note: str | None = None
    is_bedridden: bool = False


class HouseholdCreateSelf(BaseModel):
    """FR-REG-001, onboarding step. `head_name` is not asked here — it comes
    from the account created at `/auth/register`. `contact_number` **is**
    asked here (FR-REG-005): required unless `is_unreachable_by_phone` is set."""

    street_address: str | None = None
    waterway_proximity: Literal["very_near", "near", "far"] | None = None
    area_id: uuid.UUID
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    is_unreachable_by_phone: bool = False
    contact_number: str | None = None
    head_member: HeadMemberIn

    @model_validator(mode="after")
    def _contact_number_required_unless_unreachable(self) -> HouseholdCreateSelf:
        if not self.is_unreachable_by_phone and not self.contact_number:
            raise ValueError(
                "Contact number is required unless the household is flagged unreachable by phone."
            )
        return self


class HouseholdCreateBhw(BaseModel):
    """FR-REG-002/004/024, one-shot admin-console form."""

    head_name: str = Field(min_length=1)
    contact_number: str | None = None
    area_id: uuid.UUID
    street_address: str = Field(min_length=1)
    waterway_proximity: Literal["very_near", "near", "far"] | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    head_member: MemberIn
    members: list[MemberIn] = []

    @field_validator("street_address")
    @classmethod
    def _address_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Street address is required")
        return value

    @model_validator(mode="after")
    def _assisted_members_are_complete(self) -> HouseholdCreateBhw:
        for index, member in enumerate(self.members):
            if member.birth_date is None:
                raise ValueError(f"members[{index}].birth_date is required")
            if not member.relationship_to_head:
                raise ValueError(f"members[{index}].relationship_to_head is required")
        return self


class DuplicateCandidate(BaseModel):
    household_id: uuid.UUID
    reference_no: str
    head_name: str
    area_id: uuid.UUID
    match_reason: Literal["name_similarity", "member_match"]


class MemberOut(BaseModel):
    id: uuid.UUID
    full_name: str
    birth_date: date | None
    sex: str | None
    relationship_to_head: str | None
    is_head: bool
    is_child: bool
    is_senior: bool
    is_pwd: bool
    is_pregnant: bool
    is_lactating: bool
    has_chronic_condition: bool
    chronic_condition_note: str | None
    is_bedridden: bool


class RegistryMemberOut(MemberOut):
    """Admin/resident directory row enriched with household context."""

    household_id: uuid.UUID
    household_reference_no: str
    household_head_name: str
    household_head_user_id: uuid.UUID | None
    area_id: uuid.UUID
    area_name: str
    created_at: datetime


class MemberUpdate(BaseModel):
    full_name: str = Field(min_length=1)
    birth_date: date | None = None
    sex: Literal["male", "female"] | None = None
    relationship_to_head: str | None = None
    is_child: bool = False
    is_senior: bool = False
    is_pwd: bool = False
    is_pregnant: bool = False
    is_lactating: bool = False
    has_chronic_condition: bool = False
    chronic_condition_note: str | None = None
    is_bedridden: bool = False


class HouseholdUpdate(BaseModel):
    head_name: str | None = Field(default=None, min_length=1)
    contact_number: str | None = None
    is_unreachable_by_phone: bool = False
    area_id: uuid.UUID
    street_address: str | None = None
    waterway_proximity: Literal["very_near", "near", "far"] | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)

    @model_validator(mode="after")
    def _contact_number_required_unless_unreachable(self) -> HouseholdUpdate:
        if not self.is_unreachable_by_phone and not self.contact_number:
            raise ValueError(
                "Contact number is required unless the household is flagged unreachable by phone."
            )
        return self


class RegistrySummary(BaseModel):
    households: int
    citizens: int
    average_household_size: float | None
    unreachable_households: int
    possible_duplicates: int
    self_registered_households: int
    bhw_assisted_households: int
    areas: list[dict[str, object]]


class MemberTransferIn(BaseModel):
    household_id: uuid.UUID
    relationship_to_head: str = Field(min_length=1)


class MemberPromoteIn(BaseModel):
    area_id: uuid.UUID
    contact_number: str | None = None
    is_unreachable_by_phone: bool = False
    street_address: str | None = None
    waterway_proximity: Literal["very_near", "near", "far"] | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)

    @model_validator(mode="after")
    def _contact_number_required_unless_unreachable(self) -> MemberPromoteIn:
        if not self.is_unreachable_by_phone and not self.contact_number:
            raise ValueError(
                "Contact number is required unless the household is flagged unreachable by phone."
            )
        return self


class HouseholdOut(BaseModel):
    id: uuid.UUID
    reference_no: str
    head_name: str
    head_user_id: uuid.UUID | None
    contact_number: str | None
    is_unreachable_by_phone: bool
    area_id: uuid.UUID
    area_name: str | None = None
    street_address: str | None
    waterway_proximity: str | None = None
    location: GeoJsonPoint | None
    source: Literal["self", "bhw"]
    verified_at: datetime | None
    has_possible_duplicate: bool = False
    member_count: int = 0
    created_at: datetime


class HouseholdDetailOut(HouseholdOut):
    members: list[MemberOut] = []


class HouseholdCreateResponse(BaseModel):
    household: HouseholdOut
    members: list[MemberOut]
    duplicate_candidates: list[DuplicateCandidate] = []


class HouseholdMergeRequest(BaseModel):
    kept_household_id: uuid.UUID
    merged_household_id: uuid.UUID
    notes: str | None = None
