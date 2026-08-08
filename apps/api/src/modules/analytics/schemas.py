"""Pydantic request/response models for the analytics module (FR-ANL-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).

No table backs this module — these are aggregates composed from `geo`, `config`,
`registry`, and `evacuation`'s own services (AGENTS.md Section 5, rule 2). Counts
only: never a row, never a name (NFR-PRV-006).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

FloodExposure = Literal["low", "medium", "high"]


class PublicAreaStat(BaseModel):
    area_id: uuid.UUID
    area_name: str
    area_code: str | None
    flood_exposure: FloodExposure | None
    centroid: None = None  # no boundary geometry yet (BRD OI-3)
    registered_households: int
    registered_members: int
    evac_center_count: int


class PublicBarangayStats(BaseModel):
    registered_households: int
    registered_members: int
    configured_total_households: int | None
    configured_total_population: int | None
    coverage_pct: float | None
    evac_center_count: int
    active_hotline_count: int
    areas: list[PublicAreaStat]
    computed_at: datetime
