"""Scheduler entry point.

A separate container, **exactly one replica**, no HTTP surface.

Why not APScheduler inside the API: with more than one Gunicorn worker, in-process
schedulers fire every job once per worker — duplicate scrapes, duplicate alerts,
duplicate reminders. A dedicated single-replica container makes that impossible by
construction rather than by convention (architecture.md A-4).

Cadences come from docs/architecture.md Section 9.
"""

from __future__ import annotations

import logging
import os

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from jobs import (
    backup_database,
    evaluate_thresholds,
    fetch_river_level,
    fetch_tcws_signal,
    fetch_weather,
    flag_stale_records,
    send_activity_reminders,
)
from runner import configure_logging

log = logging.getLogger("cron")

# Philippine Standard Time. Everything is stored in UTC (NFR-DAT-003); the daily
# jobs are scheduled in local time because "02:00" means 02:00 in the barangay.
TIMEZONE = os.getenv("TZ", "Asia/Manila")

SCRAPE_INTERVAL_MINUTES = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "15"))


def build_scheduler() -> BlockingScheduler:
    scheduler = BlockingScheduler(
        timezone=TIMEZONE,
        job_defaults={
            # A missed run is skipped, not queued up and replayed in a burst.
            "coalesce": True,
            "max_instances": 1,
            "misfire_grace_time": 300,
        },
    )

    scheduler.add_job(fetch_weather, IntervalTrigger(minutes=20), id="fetch_weather")
    scheduler.add_job(
        fetch_river_level,
        IntervalTrigger(minutes=SCRAPE_INTERVAL_MINUTES),
        id="fetch_river_level",
    )
    scheduler.add_job(
        fetch_tcws_signal,
        IntervalTrigger(minutes=30),
        id="fetch_tcws_signal",
    )
    # Runs just after each river fetch rather than on the same trigger, so a slow
    # scrape cannot make the evaluation read the previous reading.
    scheduler.add_job(
        evaluate_thresholds,
        IntervalTrigger(minutes=SCRAPE_INTERVAL_MINUTES, jitter=30),
        id="evaluate_thresholds",
    )

    scheduler.add_job(flag_stale_records, CronTrigger(hour=2, minute=0), id="flag_stale_records")
    scheduler.add_job(backup_database, CronTrigger(hour=3, minute=0), id="backup_database")
    scheduler.add_job(
        send_activity_reminders, CronTrigger(hour=8, minute=0), id="send_activity_reminders"
    )

    return scheduler


def main() -> None:
    configure_logging(os.getenv("LOG_LEVEL", "INFO"))
    scheduler = build_scheduler()

    log.info(
        "scheduler starting",
        extra={"job": ",".join(sorted(j.id for j in scheduler.get_jobs())), "outcome": "startup"},
    )

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("scheduler stopped", extra={"outcome": "shutdown"})


if __name__ == "__main__":
    main()
