"""The adapter contract for external data (architecture.md Section 8.1).

Three implementations — Open-Meteo, PAGASA, and admin manual entry — behind one
interface, so a broken PAGASA parser is a one-file fix rather than a refactor
(T-1, NFR-MNT-009).

The contract lives in `apps/api` because the API defines the shape of a reading;
`services/cron` is what actually calls `fetch()`. **No request path ever calls an
external service** (architecture.md D-3) — the scheduler writes to the database,
the API reads from it, always.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol, runtime_checkable

# schema.md `reading.source` / `reading.metric` CHECK sets.
SOURCES = ("open_meteo", "pagasa", "manual")
METRICS = (
    "river_level",
    "rainfall",
    "temperature",
    "humidity",
    "heat_index",
    "precipitation_probability",
)


@dataclass(frozen=True, slots=True)
class Reading:
    """One measurement, ready to become a `reading` row.

    `observed_at` is when the world was measured; `fetched_at` is when we learned
    it. Both are stored because the gap between them *is* the staleness (FR-WX-011).
    A value is never rendered without its age.
    """

    source: str
    metric: str
    value: float
    unit: str
    observed_at: datetime
    station: str | None = None
    raw: dict[str, Any] | None = None  # original payload, for debugging a broken parser


@dataclass(frozen=True, slots=True)
class SourceHealth:
    """Whether a source is currently working, surfaced through `/health` (AR-4)."""

    name: str
    is_reachable: bool
    last_success_at: datetime | None = None
    detail: str | None = None


@runtime_checkable
class DataSource(Protocol):
    name: str

    def fetch(self) -> list[Reading]:
        """Return current readings. Raises on failure — the caller logs and skips.

        A failed fetch must never write. The read path returns the most recent
        reading regardless of age, labelled with that age (architecture.md 8.2).
        """
        ...

    def health(self) -> SourceHealth: ...
