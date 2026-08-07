"""HTTP surface for the users module (FR-SYS-005 … FR-SYS-009).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])
