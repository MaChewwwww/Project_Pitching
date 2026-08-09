"""rescue_request.priority_is_manual

FR-SAF-010's lazy triage (computed on first admin read of the queue) must
not silently overwrite an officer's manual priority override on a later
read. Without a flag distinguishing "computed" from "manually set", the
next lazy-triage pass over a still-`priority IS NOT NULL` row has no way to
tell the two apart — and since a manual override is exactly the case where
the computed factors are stale (an officer overrode the number *because*
the computed value was wrong for a reason the flags don't capture), the
system must never quietly replace it.

Revision ID: 0009_rescue_priority_manual
Revises: 0008_safety_core
Create Date: 2026-08-09

Refs: FR-SAF-010
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009_rescue_priority_manual"
down_revision: str | None = "0008_safety_core"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "rescue_request",
        sa.Column(
            "priority_is_manual",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("rescue_request", "priority_is_manual")
