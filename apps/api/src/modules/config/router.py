"""HTTP surface for the config module (FR-SYS-010, FR-SYS-012).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from src.core.deps import CurrentUser, require_role
from src.db.session import DbSessionDep
from src.modules.config import service
from src.modules.config.schemas import ConfigEntryOut, ConfigValuePatch

admin_router = APIRouter(tags=["config"])


@admin_router.get(
    "/config",
    dependencies=[Depends(require_role("admin"))],
    summary="List all admin-editable settings",
)
async def admin_list_config(session: DbSessionDep) -> list[ConfigEntryOut]:
    rows = await service.list_all(session)
    return [
        ConfigEntryOut(key=r.key, value=r.value, description=r.description, updated_at=r.updated_at)
        for r in rows
    ]


@admin_router.put(
    "/config/{key}", dependencies=[Depends(require_role("admin"))], summary="Edit a setting"
)
async def admin_set_config(
    key: str, body: ConfigValuePatch, session: DbSessionDep, user: CurrentUser
) -> ConfigEntryOut:
    row = await service.set_value(session, key, body.value, body.description, actor_id=user.id)
    return ConfigEntryOut(
        key=row.key, value=row.value, description=row.description, updated_at=row.updated_at
    )
