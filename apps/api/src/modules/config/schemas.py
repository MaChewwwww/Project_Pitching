"""Pydantic request/response models for the config module (FR-SYS-010, FR-SYS-012).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ConfigEntryOut(BaseModel):
    key: str
    value: Any
    description: str | None
    updated_at: datetime


class ConfigValuePatch(BaseModel):
    value: Any
    description: str | None = None
