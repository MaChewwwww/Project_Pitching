"""HTTP surface for the analytics module (FR-ANL-*).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from __future__ import annotations

from fastapi import APIRouter

from src.db.session import DbSessionDep
from src.modules.analytics import service
from src.modules.analytics.schemas import PublicBarangayStats

public_router = APIRouter(tags=["analytics"])


@public_router.get("/area-stats", summary="Area-level aggregates — counts only, no personal data")
async def public_area_stats(session: DbSessionDep) -> PublicBarangayStats:
    return await service.get_area_stats(session)
