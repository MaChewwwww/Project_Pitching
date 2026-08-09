"""Shared test fixtures.

Every test runs against the real (seeded) database, inside a transaction that
is always rolled back — never a mock, never a separate test database. That
matches how this app actually behaves: PostGIS functions, CHECK constraints,
and partial unique indexes are all part of what a service is correct *against*,
and a mock session would hide bugs in exactly those.

`session` binds an `AsyncSession` to a single `Connection`, inside one
transaction the fixture always rolls back. Services under test call
`session.commit()` themselves (registry, evacuation, ... — every module does),
so binding to a bare connection is not enough: `join_transaction_mode=
"create_savepoint"` makes each inner `commit()` a `RELEASE SAVEPOINT` instead
of ending the outer transaction, leaving the fixture's rollback as the one
thing that actually decides whether anything persists.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.core.security import create_access_token
from src.db.session import engine, get_session
from src.main import app
from src.modules.users.models import User


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    async with db_engine.connect() as conn:
        trans = await conn.begin()
        test_session = async_sessionmaker(
            bind=conn,
            class_=AsyncSession,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )()
        try:
            yield test_session
        finally:
            await test_session.close()
            await trans.rollback()


@pytest_asyncio.fixture
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """An HTTP client driving the real FastAPI app, with `get_session` swapped
    for the per-test transaction above — no other dependency is overridden, so
    auth, role checks, and rate limiting all run for real."""

    async def _override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield session

    app.dependency_overrides[get_session] = _override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.pop(get_session, None)


def _bearer(*, subject: uuid.UUID | str, role: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(subject=subject, role=role)}"}


@pytest_asyncio.fixture
async def demo_users(session: AsyncSession) -> dict[str, User]:
    """The seeded demo accounts (`seed.py` `DEMO_LOGINS`), keyed by role.

    Assumes the database has been seeded (`make seed` / a normal `make dev`
    bring-up) — the same assumption the rest of this test suite makes by
    running against the real database rather than a fixture-built one.
    """
    rows = (
        (await session.execute(select(User).where(User.email.like("%-demo@sanjose.gov.ph"))))
        .scalars()
        .all()
    )
    return {u.role: u for u in rows}


@pytest_asyncio.fixture
async def admin_client(client: AsyncClient, demo_users: dict[str, User]) -> AsyncClient:
    """Exercises `require_role` for real — a minted token for a real seeded
    user, not a stubbed `get_current_user`."""
    client.headers.update(_bearer(subject=demo_users["admin"].id, role="admin"))
    return client


@pytest_asyncio.fixture
async def head_client(client: AsyncClient, demo_users: dict[str, User]) -> AsyncClient:
    client.headers.update(_bearer(subject=demo_users["head"].id, role="head"))
    return client


@pytest_asyncio.fixture
async def bhw_client(client: AsyncClient, demo_users: dict[str, User]) -> AsyncClient:
    """BHW Demo is seeded scoped to Areas 1 and 2 (`seed.py`) — enough to
    exercise `apply_area_scope` without extra setup."""
    client.headers.update(_bearer(subject=demo_users["bhw"].id, role="bhw"))
    return client
