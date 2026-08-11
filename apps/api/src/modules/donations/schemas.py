"""API contracts for informational donation-drive articles (FR-DON-*)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from src.domain.article_document import InvalidArticleDocument, validate_article_document
from src.modules.alerts.schemas import ArticleImageOut, PublicationStatus


class PublicDonationDrive(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    excerpt: str
    event_id: uuid.UUID | None
    event_name: str | None
    organizer_name: str | None
    organizer_contact: str | None
    drop_off_instructions: str | None
    active_from: datetime | None
    active_until: datetime | None
    published_at: datetime | None
    archived_at: datetime | None
    cover_image: ArticleImageOut | None = None


class DonationDriveDetail(PublicDonationDrive):
    body_json: dict[str, Any]
    images: list[ArticleImageOut]


class DonationDriveIn(BaseModel):
    title: str
    excerpt: str = ""
    body_json: dict[str, Any] = Field(default_factory=lambda: {"type": "doc", "content": []})
    event_id: uuid.UUID | None = None
    organizer_name: str | None = None
    organizer_contact: str | None = None
    drop_off_instructions: str | None = None
    active_from: datetime | None = None
    active_until: datetime | None = None
    publication_status: PublicationStatus = "draft"

    @field_validator("body_json")
    @classmethod
    def _valid_document(cls, value: dict[str, Any]) -> dict[str, Any]:
        try:
            return validate_article_document(value)
        except InvalidArticleDocument as exc:
            raise ValueError(str(exc)) from exc
