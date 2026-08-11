"""API contracts for community activity articles (FR-ACT-*)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from src.domain.article_document import InvalidArticleDocument, validate_article_document
from src.modules.alerts.schemas import ArticleImageOut, PublicationStatus

ActivityType = Literal[
    "drill", "seminar", "first_aid", "cleanup", "tree_planting", "ngo_program", "other"
]


class PublicActivity(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    excerpt: str
    type: ActivityType
    starts_at: datetime
    ends_at: datetime | None
    venue: str | None
    area_id: uuid.UUID | None
    area_name: str | None
    published_at: datetime | None
    archived_at: datetime | None
    is_upcoming: bool
    cover_image: ArticleImageOut | None = None


class ActivityDetail(PublicActivity):
    body_json: dict[str, Any]
    images: list[ArticleImageOut]


class ActivityIn(BaseModel):
    title: str
    excerpt: str = ""
    body_json: dict[str, Any] = Field(default_factory=lambda: {"type": "doc", "content": []})
    type: ActivityType
    starts_at: datetime
    ends_at: datetime | None = None
    venue: str | None = None
    area_id: uuid.UUID | None = None
    publication_status: PublicationStatus = "draft"

    @field_validator("body_json")
    @classmethod
    def _valid_document(cls, value: dict[str, Any]) -> dict[str, Any]:
        try:
            return validate_article_document(value)
        except InvalidArticleDocument as exc:
            raise ValueError(str(exc)) from exc
