"""Open-Meteo weather adapter (FR-WX-003).

Free, no API key, no signup. One coordinate pair polled every 20 minutes is a
rounding error against the free quota — but it is still polled on a schedule and
cached in `reading`, never called per page view (tech_stack.md Section 7).
"""

from __future__ import annotations

from src.integrations.base import DataSource, Reading, SourceHealth  # noqa: F401


class OpenMeteoSource:
    """Implements `DataSource`. Not yet built — see FR-WX-001 … FR-WX-006."""

    name = "open_meteo"
