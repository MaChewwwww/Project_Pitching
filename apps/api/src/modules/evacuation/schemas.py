"""Pydantic request/response models for the evacuation module (FR-EVC-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from src.modules.geo.schemas import PublicFacility

# Mirrors EMERGENCY_EVENT_TYPES in models.py — kept in sync by hand, same
# convention as ActivityType/ActivityStatus in the activities module.
EventType = Literal["flood", "earthquake", "typhoon", "fire", "other"]


class PublicEmergencyEvent(BaseModel):
    """No `declared_by_*` — that is barangay-staff information, not public (FR-SAF-018)."""

    id: uuid.UUID
    name: str
    type: EventType
    started_at: datetime


class EmergencyEventDeclare(BaseModel):
    name: str
    type: EventType
    started_at: datetime | None = None


class EmergencyEventEnd(BaseModel):
    ended_at: datetime | None = None


class EmergencyEventPatch(BaseModel):
    name: str | None = None
    type: EventType | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    is_active: bool | None = None


class EmergencyEventOut(BaseModel):
    id: uuid.UUID
    name: str
    type: EventType
    started_at: datetime
    ended_at: datetime | None
    is_active: bool
    declared_by_user_id: uuid.UUID | None
    declared_by_name: str | None
    occupancy_reset_count: int = 0


class EmergencyEventStats(BaseModel):
    total_checkins_count: int = 0
    total_safe_count: int = 0
    total_rescue_needed_count: int = 0
    total_unaccounted_count: int = 0
    total_evacuees_count: int = 0
    active_centers_used: int = 0
    total_rescue_requests_count: int = 0
    open_rescue_requests_count: int = 0
    total_incident_reports_count: int = 0
    verified_incident_reports_count: int = 0
    total_unregistered_count: int = 0
    linked_flood_event_id: uuid.UUID | None = None


class EmergencyEventDetailOut(EmergencyEventOut):
    stats: EmergencyEventStats


class PublicEvacCenter(BaseModel):
    id: uuid.UUID
    capacity: int | None
    is_open: bool
    notes: str | None
    contact_number: str | None
    facility: PublicFacility
    # Open physical check-ins are global across concurrent emergency events.
    occupancy: int
    occupancy_pct: float | None
    is_at_capacity: bool
    occupancy_as_of: datetime


class EvacCenterIn(BaseModel):
    facility_id: uuid.UUID
    capacity: int | None = None
    contact_person: str | None = None
    contact_number: str | None = None
    is_open: bool = True
    notes: str | None = None


class EvacCheckinCreate(BaseModel):
    evac_center_id: uuid.UUID
    event_id: uuid.UUID | None = None
    member_id: uuid.UUID | None = None
    unregistered_person_id: uuid.UUID | None = None
    person_name: str
    checked_in_at: datetime | None = None


class EvacCheckinOut(BaseModel):
    id: uuid.UUID
    evac_center_id: uuid.UUID
    evac_center_name: str
    event_id: uuid.UUID
    event_name: str
    member_id: uuid.UUID | None
    unregistered_person_id: uuid.UUID | None
    person_name: str
    checked_in_at: datetime
    checked_out_at: datetime | None
    recorded_by_user_id: uuid.UUID | None
    recorded_by_name: str | None


class PortalEvacuationStatusOut(BaseModel):
    is_currently_evacuated: bool
    active_checkin: EvacCheckinOut | None
    history: list[EvacCheckinOut]
