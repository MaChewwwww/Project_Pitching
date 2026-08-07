"""HTTP surface for the safety module (FR-SAF-*).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/safety", tags=["safety"])
