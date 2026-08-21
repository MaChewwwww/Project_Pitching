"""Pydantic request/response models for the preparedness module (FR-PRP-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

HazardType = Literal["flood", "earthquake", "typhoon", "fire", "landslide", "general", "food"]
GuidePhase = Literal["before", "during", "after", "n/a"]


def _excerpt(body: str, length: int = 160) -> str:
    body = re.sub(r"^#{1,6}\s+", "", body, flags=re.MULTILINE)
    body = re.sub(r"^\s*(?:\d+\.|[-*])\s+", "", body, flags=re.MULTILINE)
    body = body.replace("**", "").replace("*", "")
    body = " ".join(body.split())
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


class AdminGuide(PublicGuide):
    is_published: bool


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

    @model_validator(mode="after")
    def _published_guides_are_attributed_and_reviewed(self) -> GuideIn:
        if self.is_published and (
            not self.source_attribution or not self.source_attribution.strip()
        ):
            raise ValueError("Published guides need a source attribution.")
        if self.is_published and self.last_reviewed_at is None:
            raise ValueError("Published guides need a last-reviewed date.")
        return self


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


class GoBagItemOut(BaseModel):
    id: uuid.UUID
    name_fil: str
    name_en: str
    category: str
    is_essential: bool
    sort_order: int
    has_item: bool


class GoBagOut(BaseModel):
    household_id: uuid.UUID
    checked_item_ids: list[uuid.UUID] = Field(default_factory=list)
    items: list[GoBagItemOut] = Field(default_factory=list)


class GoBagUpdateIn(BaseModel):
    checked_item_ids: list[uuid.UUID] = Field(default_factory=list)


class FamilyEmergencyPlanIn(BaseModel):
    meeting_point: str | None = Field(default=None, max_length=300)
    out_of_area_contact: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=2000)


class FamilyEmergencyPlanOut(FamilyEmergencyPlanIn):
    household_id: uuid.UUID
    updated_at: datetime | None = None
