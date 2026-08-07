"""HTTP surface for the geo module (FR-SYS-013, FR-SYS-015, FR-MAP-*).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/geo", tags=["geo"])
