"""PAGASA FFWS river-level scraper (FR-WX-008).

There is no public API; the Pasig-Marikina-Tullahan FFWS publishes through a page
meant for humans. Scrape politely: identify the user agent, poll no more than every
10-15 minutes, cache aggressively, back off on errors.

Isolated in this one file on purpose. Any markup change upstream breaks the parser
without warning, and the site is under heaviest load during exactly the events it
is needed for — so `ManualSource` exists as a first-class alternative, not a
fallback bolted on afterwards.
"""

from __future__ import annotations

from src.integrations.base import DataSource, Reading, SourceHealth  # noqa: F401


class PagasaSource:
    """Implements `DataSource`. Not yet built — see FR-WX-008."""

    name = "pagasa"
