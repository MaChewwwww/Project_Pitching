"""Pydantic request/response models for the preparedness module (FR-PRP-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

HazardType = Literal["flood", "earthquake", "typhoon", "fire", "landslide", "general", "food"]
GuidePhase = Literal["before", "during", "after", "n/a"]


def _excerpt(body: str, length: int = 160) -> str:
    body = body.strip()
    return body if len(body) <= length else body[:length].rsplit(" ", 1)[0] + "…"


class PublicGuideSummary(BaseModel):
    id: uuid.UUID
    slug: str
    hazard_type: HazardType
    title_fil: str
    title_en: str
    phase: GuidePhase
    source_attribution: str | None
    last_reviewed_at: datetime | None
    sort_order: int
    excerpt_fil: str
    excerpt_en: str


class PublicGuide(PublicGuideSummary):
    body_fil: str
    body_en: str


class GuideIn(BaseModel):
    slug: str
    hazard_type: HazardType
    title_fil: str
    title_en: str
    body_fil: str
    body_en: str
    phase: GuidePhase = "n/a"
    source_attribution: str | None = None
    last_reviewed_at: datetime | None = None
    is_published: bool = True
    sort_order: int = 0


class PublicFaq(BaseModel):
    id: uuid.UUID
    question_fil: str
    question_en: str
    answer_fil: str
    answer_en: str
    category: str
    sort_order: int
    is_published: bool = True


class FaqIn(BaseModel):
    question_fil: str
    question_en: str
    answer_fil: str
    answer_en: str
    category: str = "general"
    sort_order: int = 0
    is_published: bool = True
