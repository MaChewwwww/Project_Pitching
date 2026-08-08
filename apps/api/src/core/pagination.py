"""The list envelope every paginated endpoint returns (architecture.md Section 6.1).

One generic type and one helper so `{ items, total, page, size, pages }` is
identical byte-for-byte across modules — `apps/web/src/lib/api/public-types.ts`
`Page<T>` depends on that being true.
"""

from __future__ import annotations

import math
from typing import Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

T = TypeVar("T")


class Page(BaseModel, Generic[T]):  # noqa: UP046 — PEP 695 syntax isn't yet reliable with Pydantic v2 generics
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


async def paginate(
    session: AsyncSession, stmt: Select, *, page: int = 1, size: int = 20
) -> tuple[list, int]:
    """Run `stmt` with LIMIT/OFFSET and a COUNT(*) of the same filtered query.

    Returns `(rows, total)`; callers wrap `rows` into their own response schema
    before handing them to `Page(...)`.
    """
    total = (await session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await session.execute(stmt.limit(size).offset((page - 1) * size))).scalars().all()
    return list(rows), total


def page_meta(total: int, page: int, size: int) -> dict:
    return {"total": total, "page": page, "size": size, "pages": max(1, math.ceil(total / size))}
