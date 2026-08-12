"""Pydantic request/response models for the weather module (FR-WX-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).

Field names mirror `apps/web/src/lib/api/public-types.ts` exactly.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ReadingSource = Literal["open_meteo", "pagasa", "manual"]
ReadingMetric = Literal[
    "river_level",
    "rainfall",
    "temperature",
    "humidity",
    "heat_index",
    "precipitation_probability",
    "tcws_signal",
]


class PublicReading(BaseModel):
    id: int
    source: ReadingSource
    metric: ReadingMetric
    value: float
    unit: str
    station: str | None
    observed_at: datetime
    fetched_at: datetime
    age_minutes: int
    is_stale: bool
    stale_after_minutes: int


class PublicForecastPoint(BaseModel):
    valid_at: datetime
    metric: ReadingMetric
    value: float
    unit: str
    horizon: Literal["hourly", "daily"]
    source: ReadingSource
    fetched_at: datetime


class PublicWeatherCurrent(BaseModel):
    readings: list[PublicReading]
    peak_readings: list[PublicReading]
    observed_at: datetime | None
    source: ReadingSource | None
    is_stale: bool
    forecast: list[PublicForecastPoint]


class RiverThresholds(BaseModel):
    level_1_m: float | None
    level_2_m: float | None
    level_3_m: float | None


class PublicRiverLevel(BaseModel):
    reading: PublicReading | None
    alert_level: Literal[0, 1, 2, 3]
    thresholds: RiverThresholds | None
    is_stale: bool
    last_known_good: PublicReading | None


class PublicFloodEvent(BaseModel):
    id: uuid.UUID
    emergency_event_id: uuid.UUID | None = None
    name: str
    started_at: datetime
    ended_at: datetime | None
    is_ongoing: bool = False
    peak_level_m: float | None
    peak_at: datetime | None
    households_displaced: int | None
    notes: str | None
    area_names: list[str]


class ManualReadingIn(BaseModel):
    metric: ReadingMetric
    value: float
    unit: str
    observed_at: datetime | None = None  # defaults to now — the officer is reading it right now


class SimulateTyphoonResult(BaseModel):
    """A demo tool, not a requirement of its own — see tech_stack.md Section 7's
    follow-up note on FR-WX-016. Writes a real, rising sequence of manual
    readings and returns what it created so the console can summarise it."""

    readings: list[PublicReading]
    alert_prompts_created: int
    highest_alert_level: Literal[0, 1, 2, 3]


class FloodEventIn(BaseModel):
    name: str
    emergency_event_id: uuid.UUID | None = None
    started_at: datetime
    ended_at: datetime | None = None
    peak_level_m: float | None = None
    peak_at: datetime | None = None
    households_displaced: int | None = None
    notes: str | None = None
    area_ids: list[uuid.UUID] = []
