"""Admin-entered readings (FR-WX-007).

Not a fallback flag — a first-class source. It writes the same `reading` row shape
with `source='manual'` and full attribution via `entered_by_user_id`, so when the
scraper dies during the storm it exists for, an officer types the number in and
every downstream feature keeps working unchanged.
"""

from __future__ import annotations

from src.integrations.base import DataSource, Reading, SourceHealth  # noqa: F401


class ManualSource:
    """Implements `DataSource`. Not yet built — see FR-WX-007."""

    name = "manual"
