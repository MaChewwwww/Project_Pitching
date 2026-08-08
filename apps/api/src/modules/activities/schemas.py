"""Pydantic request/response models for the activities module (FR-ACT-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ActivityType = Literal[
    "drill", "seminar", "first_aid", "cleanup", "tree_planting", "ngo_program", "other"
]


class PublicActivity(BaseModel):
    id: uuid.UUID
    title: str
    type: ActivityType
    description: str | None
    starts_at: datetime
    ends_at: datetime | None
    venue: str | None
    area_id: uuid.UUID | None
    area_name: str | None
    is_upcoming: bool


class ActivityIn(BaseModel):
    title: str
    type: ActivityType
    description: str | None = None
    starts_at: datetime
    ends_at: datetime | None = None
    venue: str | None = None
    area_id: uuid.UUID | None = None
    is_published: bool = True
