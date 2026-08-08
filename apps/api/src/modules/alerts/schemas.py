"""Pydantic request/response models for the alerts module (FR-ALT-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).

Field names mirror `apps/web/src/lib/api/public-types.ts` `PublicAnnouncement`
exactly — same names, same nullability — so closing the frontend seam is not a
rename pass.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, model_validator

ANNOUNCEMENT_KINDS = ("announcement", "alert")
ANNOUNCEMENT_TYPES = (
    "general",
    "class_suspension",
    "road_closure",
    "utility_interruption",
    "flood_warning",
    "earthquake",
    "typhoon",
    "heavy_rainfall",
    "heat_index",
    "evacuation",
)
ANNOUNCEMENT_SEVERITIES = ("info", "warning", "emergency")


class PublicAnnouncement(BaseModel):
    id: uuid.UUID
    kind: Literal["announcement", "alert"]
    type: str
    severity: Literal["info", "warning", "emergency"] | None
    alert_level: Literal[1, 2, 3] | None
    title: str
    body: str
    instruction: str | None
    is_barangay_wide: bool
    published_at: datetime | None
    expires_at: datetime | None
    deactivated_at: datetime | None
    area_names: list[str]
    issued_by_name: str
    is_active: bool


class AnnouncementIn(BaseModel):
    kind: Literal["announcement", "alert"]
    type: str
    severity: Literal["info", "warning", "emergency"] | None = None
    alert_level: Literal[1, 2, 3] | None = None
    title: str
    body: str
    instruction: str | None = None
    is_barangay_wide: bool = True
    area_ids: list[uuid.UUID] = []
    expires_at: datetime | None = None
    # Publish immediately (sets published_at = now) unless explicitly False, which
    # saves a draft that the officer can publish later via /publish.
    publish_now: bool = True

    @model_validator(mode="after")
    def _alert_needs_instruction(self) -> AnnouncementIn:
        # Mirrors the DB CHECK `chk_alert_needs_instruction` — surfaced as a 422
        # field error here rather than a 500 from a constraint violation.
        if self.kind == "alert" and not self.instruction:
            raise ValueError("An alert cannot be published without an instruction (FR-ALT-005).")
        return self


class AlertPromptOut(BaseModel):
    id: uuid.UUID
    reading_id: int | None
    level: Literal[1, 2, 3]
    threshold_value: float
    created_at: datetime
    acknowledged_by_user_id: uuid.UUID | None
    acknowledged_at: datetime | None
    resulted_in_announcement_id: uuid.UUID | None
