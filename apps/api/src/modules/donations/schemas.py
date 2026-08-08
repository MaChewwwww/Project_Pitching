"""Pydantic request/response models for the donations module (FR-DON-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).

No monetary field exists anywhere below, and none may be added (FR-DON-010).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

DonationStatus = Literal["submitted", "received", "partially_received", "not_fulfilled"]


class PublicDriveNeed(BaseModel):
    id: uuid.UUID
    item_name: str
    target_quantity: float
    unit: str
    sort_order: int
    received_quantity: float
    pledged_quantity: float
    progress_pct: float


class PublicDonationDrive(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    status: Literal["open", "closed"]
    opened_at: datetime
    closed_at: datetime | None
    event_id: uuid.UUID | None
    event_name: str | None
    needs: list[PublicDriveNeed]
    overall_progress_pct: float


class DriveNeedIn(BaseModel):
    item_name: str
    target_quantity: float
    unit: str
    sort_order: int = 0


class DonationDriveIn(BaseModel):
    title: str
    description: str | None = None
    needs: list[DriveNeedIn] = []


class DonationOut(BaseModel):
    id: uuid.UUID
    drive_id: uuid.UUID
    reference_no: str
    donor_name: str
    donor_contact: str | None
    item_name: str
    quantity_pledged: float
    quantity_received: float | None
    unit: str
    status: DonationStatus
    is_walk_in: bool
    created_at: datetime


class DonationStatusPatch(BaseModel):
    status: DonationStatus
    quantity_received: float | None = None
