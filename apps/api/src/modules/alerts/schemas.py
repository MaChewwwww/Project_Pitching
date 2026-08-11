"""API contracts for alerts and routine announcement articles (FR-ALT-*)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from src.domain.article_document import InvalidArticleDocument, validate_article_document

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
PublicationStatus = Literal["draft", "published", "archived"]


class ArticleImageOut(BaseModel):
    id: uuid.UUID
    url: str
    alt_text: str
    caption: str | None
    sort_order: int
    is_cover: bool


class ArticleImagePatch(BaseModel):
    alt_text: str | None = None
    caption: str | None = None
    is_cover: bool | None = None


class ImageOrderIn(BaseModel):
    image_ids: list[uuid.UUID]


class PublicAnnouncement(BaseModel):
    id: uuid.UUID
    slug: str
    kind: Literal["announcement", "alert"]
    type: str
    severity: Literal["info", "warning", "emergency"] | None
    alert_level: Literal[1, 2, 3] | None
    title: str
    excerpt: str
    body: str
    instruction: str | None
    is_barangay_wide: bool
    published_at: datetime | None
    expires_at: datetime | None
    deactivated_at: datetime | None
    archived_at: datetime | None
    area_names: list[str]
    issued_by_name: str
    is_active: bool
    cover_image: ArticleImageOut | None = None


class AnnouncementDetail(PublicAnnouncement):
    body_json: dict[str, Any]
    images: list[ArticleImageOut]


class AdminAnnouncementDetail(AnnouncementDetail):
    """Editor-only targeting IDs; public readers receive display names only."""

    area_ids: list[uuid.UUID]


class AnnouncementIn(BaseModel):
    kind: Literal["announcement", "alert"]
    type: str
    severity: Literal["info", "warning", "emergency"] | None = None
    alert_level: Literal[1, 2, 3] | None = None
    title: str
    excerpt: str = ""
    body_json: dict[str, Any] = Field(default_factory=lambda: {"type": "doc", "content": []})
    instruction: str | None = None
    is_barangay_wide: bool = True
    area_ids: list[uuid.UUID] = Field(default_factory=list)
    expires_at: datetime | None = None
    publication_status: PublicationStatus = "draft"

    @field_validator("body_json")
    @classmethod
    def _valid_document(cls, value: dict[str, Any]) -> dict[str, Any]:
        try:
            return validate_article_document(value)
        except InvalidArticleDocument as exc:
            raise ValueError(str(exc)) from exc

    @model_validator(mode="after")
    def _alert_needs_instruction(self) -> AnnouncementIn:
        if self.kind == "alert" and self.publication_status == "published" and not self.instruction:
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
