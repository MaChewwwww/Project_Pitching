"""Business logic and transaction boundaries for the config module (FR-SYS-010, FR-SYS-012).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).

This is retained for migration compatibility and the legacy internal endpoint.
Runtime operational values are loaded from `core.config` and environment profiles;
feature services should not use this table as their source of truth.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.errors import NotFoundError
from src.modules.config.models import Config


async def get_value(session: AsyncSession, key: str) -> Any | None:
    row = await session.get(Config, key)
    return row.value if row else None


async def get_values(session: AsyncSession, keys: list[str]) -> dict[str, Any]:
    rows = (await session.execute(select(Config).where(Config.key.in_(keys)))).scalars().all()
    return {row.key: row.value for row in rows}


async def list_all(session: AsyncSession) -> list[Config]:
    return list((await session.execute(select(Config).order_by(Config.key))).scalars().all())


async def set_value(
    session: AsyncSession, key: str, value: Any, description: str | None, *, actor_id: uuid.UUID
) -> Config:
    row = await session.get(Config, key)
    if row is None:
        raise NotFoundError(
            f"Unknown config key '{key}'. Config keys are seeded by migration, not created ad hoc."
        )
    row.value = value
    if description is not None:
        row.description = description
    row.updated_by_user_id = actor_id
    row.updated_at = datetime.now(UTC)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="config.update",
        entity_type="config",
        entity_id=None,
        changes={"key": key, "value": value},
    )
    await session.commit()
    return row
