"""Pydantic request/response models for the evacuation module (FR-EVC-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from src.modules.geo.schemas import PublicFacility


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
