"""Admin-entered readings (FR-WX-007).

Not a fallback flag — a first-class source. It writes the same `reading` row shape
with `source='manual'` and full attribution via `entered_by_user_id`, so when the
scraper dies during the storm it exists for, an officer types the number in and
every downstream feature keeps working unchanged.

Unlike `OpenMeteoSource` and `PagasaSource`, nothing ever calls `fetch()` here —
manual entry is a write triggered by `POST /admin/readings`
(`src/modules/weather/service.py:record_manual_reading`), not a scheduled pull.
This class exists so `ManualSource` shows up as a real `DataSource` implementation
for anything that enumerates sources (e.g. `/health`-style adapter status), not
because `services/cron` ever instantiates it.
"""

from __future__ import annotations

from datetime import UTC, datetime

from .base import Reading, SourceHealth  # noqa: F401


class ManualSource:
    """Implements `DataSource`'s shape; `fetch()` is intentionally a no-op path —
    see the module docstring for why nothing ever calls it."""

    name = "manual"

    def fetch(self) -> list[Reading]:
        return []

    def health(self) -> SourceHealth:
        # Always "reachable" — there is no upstream to be unreachable from.
        return SourceHealth(name=self.name, is_reachable=True, last_success_at=datetime.now(UTC))
