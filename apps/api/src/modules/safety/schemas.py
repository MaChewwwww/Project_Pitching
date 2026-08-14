"""Pydantic request/response models for the safety module (FR-SAF-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from src.modules.evacuation.schemas import PublicEmergencyEvent, PublicEvacCenter
from src.modules.geo.schemas import GeoJsonPoint

SafetyStatusValue = Literal["safe", "needs_rescue", "unaccounted"]
SetMethod = Literal["self", "assisted", "household_bulk"]
RescueRequestStatus = Literal["pending", "verified", "dispatched", "resolved", "dismissed"]


class SafetyStatusSelfIn(BaseModel):
    """`POST /me/safety-status`. `set_method` is never accepted from the
    client — the router derives it from the tier + scope (`_resolve_set_method`
    in `service.py`), so a resident cannot forge `"assisted"` and impersonate
    barangay confirmation."""

    event_id: uuid.UUID | None = None
    evac_center_id: uuid.UUID | None = None
    status: SafetyStatusValue
    scope: Literal["member", "household"]
    member_ids: list[uuid.UUID] = Field(default_factory=list)
    # FR-SAF-003: required for scope="household" and checked server-side
    # against the live roster — see `set_household_status`.
    acknowledged_member_ids: list[uuid.UUID] = Field(default_factory=list)

    @model_validator(mode="after")
    def _scope_matches_payload(self) -> SafetyStatusSelfIn:
        if self.scope == "member" and not self.member_ids:
            raise ValueError("member_ids is required when scope is 'member'.")
        if self.scope == "household" and not self.acknowledged_member_ids:
            raise ValueError("acknowledged_member_ids is required when scope is 'household'.")
        return self


class SafetyStatusAdminIn(BaseModel):
    """`POST /admin/safety-status`. Same shape as the `/me` version plus the
    admin-only `unregistered` scope and an explicit `household_id` (an admin
    acts on someone else's household, so it can't be inferred from the
    caller)."""

    event_id: uuid.UUID | None = None
    evac_center_id: uuid.UUID | None = None
    status: SafetyStatusValue
    scope: Literal["member", "household", "unregistered"]
    household_id: uuid.UUID | None = None
    member_ids: list[uuid.UUID] = Field(default_factory=list)
    acknowledged_member_ids: list[uuid.UUID] = Field(default_factory=list)
    unregistered_person_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def _scope_matches_payload(self) -> SafetyStatusAdminIn:
        if self.scope == "member" and (not self.household_id or not self.member_ids):
            raise ValueError("household_id and member_ids are required when scope is 'member'.")
        if self.scope == "household" and (
            not self.household_id or not self.acknowledged_member_ids
        ):
            raise ValueError(
                "household_id and acknowledged_member_ids are required when scope is 'household'."
            )
        if self.scope == "unregistered" and not self.unregistered_person_id:
            raise ValueError("unregistered_person_id is required when scope is 'unregistered'.")
        return self


class MemberSafetyOut(BaseModel):
    member_id: uuid.UUID
    full_name: str
    is_head: bool
    status: SafetyStatusValue
    set_method: SetMethod | None
    set_at: datetime | None
    set_by_name: str | None
    # Raw flag names (e.g. "is_bedridden") — S3's triage reuses this shape,
    # and it's already what the dashboard needs to explain a status, not a
    # computed vulnerability level (that scoring is blocked on BRD OI-18).
    vulnerability_flags: list[str]


class HouseholdSafetyOut(BaseModel):
    event: PublicEmergencyEvent
    household_id: uuid.UUID
    reference_no: str
    members: list[MemberSafetyOut]


class MySafetyOut(BaseModel):
    # `event` is null → "no active emergency" empty state, not an error.
    event: PublicEmergencyEvent | None
    household: HouseholdSafetyOut | None


class AreaAccountedFor(BaseModel):
    area_id: uuid.UUID | None
    area_name: str
    registered_members: int
    # FR-SAF-005: individually confirmed vs. swept in by a household bulk
    # action, kept as separate counts rather than one combined "safe" number.
    safe_confirmed: int
    safe_bulk: int
    needs_rescue: int
    unaccounted: int


class AccountedForOut(BaseModel):
    event: PublicEmergencyEvent
    computed_at: datetime
    registered: list[AreaAccountedFor]
    registered_total: AreaAccountedFor
    # FR-SAF-013: unregistered counts live in their own fields, at a separate
    # nesting level from `registered` — there is no shape here in which a
    # caller could accidentally sum them into the registered coverage figures.
    unregistered_safe: int
    unregistered_needs_rescue: int


class WorkspaceMemberOut(BaseModel):
    member_id: uuid.UUID
    full_name: str
    is_head: bool
    status: SafetyStatusValue
    set_method: SetMethod | None
    vulnerability_flags: list[str]
    evac_center_id: uuid.UUID | None
    evac_center_name: str | None


class WorkspaceHouseholdOut(BaseModel):
    household_id: uuid.UUID
    reference_no: str
    head_name: str
    area_id: uuid.UUID
    area_name: str
    street_address: str | None
    location: GeoJsonPoint | None
    waterway_proximity: str | None
    members: list[WorkspaceMemberOut]
    safe_count: int
    needs_rescue_count: int
    unaccounted_count: int
    all_safe: bool


class WorkspaceUnregisteredOut(BaseModel):
    id: uuid.UUID
    full_name: str
    location: GeoJsonPoint
    status: SafetyStatusValue
    vulnerability_flags: list[str]
    evac_center_id: uuid.UUID | None
    evac_center_name: str | None


class EmergencyWorkspaceOut(BaseModel):
    event: PublicEmergencyEvent
    is_read_only: bool
    households: list[WorkspaceHouseholdOut]
    unregistered_pins: list[WorkspaceUnregisteredOut]
    unmapped_household_count: int
    evacuation_centers: list[PublicEvacCenter]


class RescueRequestPublicIn(BaseModel):
    """`POST /public/rescue-requests` (FR-SAF-008/009) — no account required.

    A pin or a free-text description of where the requester is: rescuers need
    somewhere to go, but requiring both would reject someone who only knows a
    landmark name, and requiring exact coordinates from a panicking resident
    on a bad connection is unrealistic.
    """

    requester_name: str = Field(min_length=1, max_length=120)
    contact_number: str | None = Field(default=None, max_length=40)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location_note: str | None = Field(default=None, max_length=300)
    description: str = Field(min_length=1, max_length=1000)
    people_count: int | None = Field(default=None, ge=1, le=99)

    @model_validator(mode="after")
    def _findable(self) -> RescueRequestPublicIn:
        if self.latitude is None and self.longitude is None and not self.location_note:
            raise ValueError(
                "Give a map pin or describe where you are — rescuers need somewhere to go."
            )
        return self


class RescueRequestAck(BaseModel):
    """Deliberately just an id and a timestamp — no `status` field. Returning
    `status: "pending"` reads as "queued for rescue", and FR-SAF-017 forbids
    anything that implies a guaranteed response."""

    id: uuid.UUID
    received_at: datetime


class RescueRequestOut(BaseModel):
    """The admin/BHW queue view (FR-SAF-010). `source_ip` never appears here
    — abuse-investigation data, reachable only via the audit log and psql."""

    id: uuid.UUID
    created_at: datetime
    requester_name: str
    contact_number: str | None
    location: GeoJsonPoint | None
    location_note: str | None
    description: str
    people_count: int | None
    status: RescueRequestStatus
    priority: int | None
    priority_factors: list[str]
    priority_is_manual: bool
    is_registered: bool
    household_reference_no: str | None
    area_name: str | None
    # Always null — see the FR-SAF-010 deviation note in frs_nfrs.md Section 9.
    # A snapshot of a level that BRD OI-18 has not defined yet.
    vulnerability_level: None = None
    assigned_to_user_id: uuid.UUID | None
    assigned_to_name: str | None
    resolved_at: datetime | None
    resolution_note: str | None


class RescueRequestPatch(BaseModel):
    """`PATCH /admin/rescue-requests/{id}`. Transitions are validated
    server-side in `service.py` — `pending -> verified -> dispatched ->
    resolved`, and any state -> `dismissed`. Moving to `resolved` or
    `dismissed` requires `resolution_note`; the column already exists
    (unlike `incident_report`'s equivalent, this is not a doc gap)."""

    status: RescueRequestStatus | None = None
    assigned_to_user_id: uuid.UUID | None = None
    resolution_note: str | None = None
    # An officer's manual override. Recorded distinctly from the computed
    # value (`priority_is_manual` on the way out) rather than silently
    # overwriting it, so the UI can say "set by <officer>" instead of
    # presenting a stale set of computed factors next to a number they no
    # longer explain.
    priority: int | None = None

    @model_validator(mode="after")
    def _resolution_requires_a_note(self) -> RescueRequestPatch:
        if self.status in ("resolved", "dismissed") and not self.resolution_note:
            raise ValueError(
                "A resolution note is required in the same request that "
                "resolves or dismisses a rescue request."
            )
        return self


class UnregisteredPersonIn(BaseModel):
    """`POST /admin/unregistered-persons` (FR-SAF-012/020).

    Name and event are required; contact, location, support needs, and physical
    evacuation-center assignment are operationally optional.
    """

    event_id: uuid.UUID | None = None
    evac_center_id: uuid.UUID | None = None
    full_name: str = Field(min_length=1, max_length=120)
    contact_number: str | None = Field(default=None, max_length=40)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location_note: str | None = Field(default=None, max_length=300)
    initial_status: Literal["safe", "needs_rescue"]
    is_child: bool = False
    is_senior: bool = False
    is_pwd: bool = False
    is_pregnant: bool = False
    is_lactating: bool = False
    has_chronic_condition: bool = False
    chronic_condition_note: str | None = Field(default=None, max_length=300)
    is_bedridden: bool = False

    @model_validator(mode="after")
    def _complete_optional_pin(self) -> UnregisteredPersonIn:
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Provide both latitude and longitude, or leave both blank.")
        return self


class UnregisteredPersonPatch(BaseModel):
    full_name: str | None = None
    contact_number: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    location_note: str | None = None
    is_child: bool | None = None
    is_senior: bool | None = None
    is_pwd: bool | None = None
    is_pregnant: bool | None = None
    is_lactating: bool | None = None
    has_chronic_condition: bool | None = None
    chronic_condition_note: str | None = None
    is_bedridden: bool | None = None

    @model_validator(mode="after")
    def _complete_optional_pin(self) -> UnregisteredPersonPatch:
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Provide both latitude and longitude, or leave both blank.")
        return self


class UnregisteredPersonOut(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    created_at: datetime
    full_name: str
    contact_number: str | None
    location: GeoJsonPoint | None
    location_note: str | None
    # The current safety_status for this person — "unaccounted" if somehow
    # none exists, though create_unregistered always writes one.
    status: SafetyStatusValue
    recorded_by_name: str | None
    converted_household_id: uuid.UUID | None
    converted_member_id: uuid.UUID | None
    is_child: bool
    is_senior: bool
    is_pwd: bool
    is_pregnant: bool
    is_lactating: bool
    has_chronic_condition: bool
    chronic_condition_note: str | None
    is_bedridden: bool
    evac_center_id: uuid.UUID | None
    evac_center_name: str | None


IncidentType = Literal[
    "flooding", "fire", "fallen_tree", "road_blockage", "landslide", "power_outage", "other"
]
IncidentStatus = Literal["pending", "verified", "dismissed"]


class IncidentReportIn(BaseModel):
    """Built by the router from individual `Form(...)` fields — multipart
    requests don't carry a JSON body — then handed to the service alongside
    the `UploadFile`, if any."""

    event_id: uuid.UUID | None = None
    type: IncidentType
    description: str = Field(min_length=1, max_length=1000)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location_note: str | None = Field(default=None, max_length=300)


class IncidentReportOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    type: IncidentType
    description: str
    location: GeoJsonPoint | None
    location_note: str | None
    # "/uploads/" + the stored relative path — the DTO exposes the URL,
    # never the filesystem path (core/uploads.py).
    photo_url: str | None
    status: IncidentStatus
    reported_by_name: str | None
    verified_by_name: str | None
    verified_at: datetime | None
    dismissal_reason: str | None


class IncidentReportReview(BaseModel):
    """`PATCH /admin/incident-reports/{id}`. Dismissing without a reason is
    rejected here (422) *and* by the database CHECK — belt and braces, the
    same shape as `RescueRequestPatch`'s resolution-note requirement."""

    status: Literal["verified", "dismissed"]
    dismissal_reason: str | None = None

    @model_validator(mode="after")
    def _dismissal_requires_a_reason(self) -> IncidentReportReview:
        if self.status == "dismissed" and not self.dismissal_reason:
            raise ValueError("A reason is required to dismiss an incident report.")
        return self
