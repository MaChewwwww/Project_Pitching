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

    name: str
    type: EventType
    started_at: datetime


class EmergencyEventDeclare(BaseModel):
    name: str
    type: EventType
    started_at: datetime | None = None
    # Closing a live event is a side effect big enough that a caller must opt in
    # explicitly, not have it happen implicitly because they forgot one was open.
    supersede_active: bool = False


class EmergencyEventOut(BaseModel):
    id: uuid.UUID
    name: str
    type: EventType
    started_at: datetime
    ended_at: datetime | None
    is_active: bool
    declared_by_user_id: uuid.UUID | None
    declared_by_name: str | None


class PublicEvacCenter(BaseModel):
    id: uuid.UUID
    capacity: int | None
    is_open: bool
    notes: str | None
    contact_number: str | None
    facility: PublicFacility
    # `evac_checkin` is deferred (FR-SAF-012 scope) — occupancy is always 0 until
    # it lands. Truthful today: nobody is checked in outside a declared event.
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
