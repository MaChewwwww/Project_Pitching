"""Synchronous database engine for cron jobs.

Jobs are plain functions invoked by APScheduler's `BlockingScheduler` — sync, not
async — so this is a sync SQLAlchemy Core engine over psycopg3, not the async ORM
`apps/api` uses. There is no ORM here on purpose: the ORM models live in
`apps/api/src/modules/*/models.py`, and importing them across the container
boundary is exactly what architecture.md Section 8.1 says not to do. Raw SQL
against the same tables is the honest alternative — `schema.md` is the contract
both sides read from.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql+psycopg://app:app_dev_password@db:5432/appdb"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
