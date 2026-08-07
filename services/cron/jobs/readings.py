"""External data ingestion and threshold evaluation.

This is the only place in the system allowed to call an external service
(architecture.md D-3). The scheduler writes to `reading`; the API reads from it.
No user request ever triggers an outbound call.
"""

from __future__ import annotations

import logging

from runner import job

log = logging.getLogger("cron.readings")


@job("fetch_weather")
def fetch_weather() -> None:
    """Poll Open-Meteo every 20 minutes and write to `reading` (FR-WX-003).

    Not yet implemented. When it is:
      - a failed fetch logs source and reason, and writes nothing (NFR-OBS-003)
      - `observed_at` comes from the payload, `fetched_at` is now
      - the read path keeps returning the previous value, labelled with its age
    """
    log.info("not implemented", extra={"source": "open_meteo"})


@job("fetch_river_level")
def fetch_river_level() -> None:
    """Scrape the PAGASA FFWS river level every 15 minutes (FR-WX-008).

    Not yet implemented. Scrape politely — identify the user agent, back off on
    errors, and never poll faster than every 10 minutes. The site is under heaviest
    load during exactly the events this exists for.

    When the parser breaks, `ManualSource` is the answer: an officer enters the
    reading and every downstream feature keeps working (FR-WX-007).
    """
    log.info("not implemented", extra={"source": "pagasa"})


@job("evaluate_thresholds")
def evaluate_thresholds() -> None:
    """Compare the latest river reading against the configured thresholds.

    Not yet implemented. **This job creates an `alert_prompt`, never an alert.**

    A threshold breach notifies the BDRRMC; publishing to the public requires a
    named officer calling `POST /admin/alerts`. `alert_prompt.resulted_in_
    announcement_id` staying null is a legitimate, recorded outcome — the officer
    looked and decided not to warn.

    Automated warnings from a student prototype to 143,000 residents is not a risk
    worth taking (architecture.md D-4, A-10). Do not shortcut this.
    """
    log.info("not implemented", extra={"source": "thresholds"})
