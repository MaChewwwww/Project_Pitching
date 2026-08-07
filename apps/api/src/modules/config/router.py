"""HTTP surface for the config module (FR-SYS-010, FR-SYS-012).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/config", tags=["config"])
