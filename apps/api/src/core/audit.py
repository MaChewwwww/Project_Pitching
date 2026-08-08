"""The one audit-log write path (FR-SYS-008).

Every mutating service method calls `write_audit` after its write succeeds, inside
the same transaction. Append-only — there is no update or delete path, by design
(schema.md Section 3).
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.users.models import AuditLog


async def write_audit(
    session: AsyncSession,
    *,
    actor_user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | str | None = None,
    changes: dict[str, Any] | None = None,
    ip: str | None = None,
) -> None:
    """Record one state change. `actor_user_id` is null only for system actions.

    `action` is a dotted verb, e.g. "household.create", "announcement.publish" —
    consistent naming is what makes `GET /admin/audit-log` filterable in practice.
    """
    session.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=uuid.UUID(str(entity_id)) if entity_id is not None else None,
            changes=changes,
            ip=ip,
        )
    )
