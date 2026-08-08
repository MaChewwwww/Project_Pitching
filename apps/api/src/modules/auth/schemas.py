"""Pydantic request/response models for the auth module (FR-SYS-001 … FR-SYS-004).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AccessTokenResponse(BaseModel):
    """The refresh token never appears in a response body — it is set as an
    httpOnly cookie by the router (architecture.md Section 7.1)."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


class MeResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    status: str
    assigned_area_ids: list[uuid.UUID] = []
