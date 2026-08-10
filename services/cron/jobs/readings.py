"""External data ingestion and threshold evaluation.

This is the only place in the system allowed to call an external service
(architecture.md D-3). The scheduler writes to `reading`; the API reads from it.
No user request ever triggers an outbound call.

Raw SQL against the same tables `apps/api`'s ORM models define — there is no ORM
here, deliberately (see `db.py`'s docstring).
"""

from __future__ import annotations

import json
import logging
import os

from sqlalchemy import text

from db import engine
from integrations.open_meteo import OpenMeteoSource
from integrations.pagasa import PagasaSource
from runner import job

log = logging.getLogger("cron.readings")

OPEN_METEO_LAT = float(os.environ.get("OPEN_METEO_LAT", "14.735"))
OPEN_METEO_LON = float(os.environ.get("OPEN_METEO_LON", "121.135"))
PAGASA_STATION = os.environ.get("PAGASA_STATION", "Montalban")

_INSERT_READING = text(
    """
    INSERT INTO reading (source, metric, value, unit, station, observed_at, fetched_at, raw)
    VALUES (:source, :metric, :value, :unit, :station, :observed_at, now(), :raw)
    RETURNING id
    """
)

_UPSERT_FORECAST = text(
    """
    INSERT INTO forecast (source, metric, value, unit, valid_at, horizon, fetched_at)
    VALUES (:source, :metric, :value, :unit, :valid_at, :horizon, now())
    ON CONFLICT (source, metric, horizon, valid_at)
    DO UPDATE SET value = EXCLUDED.value, fetched_at = EXCLUDED.fetched_at
    """
)


@job("fetch_weather")
def fetch_weather() -> None:
    """Poll Open-Meteo every 20 minutes and write to `reading` + `forecast` (FR-WX-003).

    A failed fetch logs source and reason and writes nothing (NFR-OBS-003); the
    read path keeps returning the previous value, labelled with its age.
    """
    source = OpenMeteoSource(latitude=OPEN_METEO_LAT, longitude=OPEN_METEO_LON)
    try:
        readings = source.fetch()
        forecast_points = source.fetch_forecast()
    except Exception as exc:
        log.warning("fetch failed", extra={"source": "open_meteo", "reason": str(exc)})
        raise  # re-raised so @job also records outcome=failure

    with engine.begin() as conn:
        for r in readings:
            conn.execute(
                _INSERT_READING,
                {
                    "source": r.source, "metric": r.metric, "value": r.value, "unit": r.unit,
                    "station": r.station, "observed_at": r.observed_at,
                    "raw": json.dumps(r.raw) if r.raw is not None else None,
                },
            )
        for point in forecast_points:
            conn.execute(
                _UPSERT_FORECAST,
                {
                    "source": "open_meteo", "metric": point["metric"], "value": point["value"],
                    "unit": point["unit"], "valid_at": point["valid_at"], "horizon": "hourly",
                },
            )

    log.info(
        "fetch_weather written",
        extra={"job": "fetch_weather", "written": len(readings), "source": "open_meteo"},
    )


@job("fetch_river_level")
def fetch_river_level() -> None:
    """Poll the PAGASA FFWS gauge for the configured station (FR-WX-008).

    An idle gauge (`wl: null`) returns zero readings — that is not a failure, it
    is "nothing new yet", and is logged and skipped without raising. When the
    parser breaks or the site is unreachable, `ManualSource` is the answer: an
    officer enters the reading via `POST /admin/readings` (FR-WX-007).
    """
    source = PagasaSource(station=PAGASA_STATION)
    try:
        readings = source.fetch()
    except Exception as exc:
        log.warning("fetch failed", extra={"source": "pagasa", "reason": str(exc)})
        raise

    if not readings:
        log.info("no new reading (gauge idle)", extra={"job": "fetch_river_level", "source": "pagasa"})
        return

    with engine.begin() as conn:
        for r in readings:
            conn.execute(
                _INSERT_READING,
                {
                    "source": r.source, "metric": r.metric, "value": r.value, "unit": r.unit,
                    "station": r.station, "observed_at": r.observed_at,
                    "raw": json.dumps(r.raw) if r.raw is not None else None,
                },
            )

    log.info(
        "fetch_river_level written",
        extra={"job": "fetch_river_level", "written": len(readings), "source": "pagasa"},
    )


@job("fetch_tcws_signal")
def fetch_tcws_signal() -> None:
    """Poll PAGASA for Tropical Cyclone Wind Signal (TCWS #1 to #5) status in Rizal."""
    source = PagasaSource(station=PAGASA_STATION)
    try:
        readings = source.fetch_tcws()
    except Exception as exc:
        log.warning("fetch failed", extra={"source": "pagasa_tcws", "reason": str(exc)})
        raise

    with engine.begin() as conn:
        for r in readings:
            conn.execute(
                _INSERT_READING,
                {
                    "source": r.source,
                    "metric": r.metric,
                    "value": r.value,
                    "unit": r.unit,
                    "station": r.station,
                    "observed_at": r.observed_at,
                    "raw": json.dumps(r.raw) if r.raw is not None else None,
                },
            )

    log.info(
        "fetch_tcws_signal written",
        extra={"job": "fetch_tcws_signal", "written": len(readings), "source": "pagasa"},
    )


_LATEST_RIVER_READING = text(
    "SELECT id, value FROM reading WHERE metric = 'river_level' ORDER BY observed_at DESC LIMIT 1"
)
_THRESHOLDS = text(
    "SELECT key, value FROM config WHERE key IN "
    "('alert.threshold_level_1_m', 'alert.threshold_level_2_m', 'alert.threshold_level_3_m')"
)
_EXISTING_PROMPT_FOR_READING = text("SELECT 1 FROM alert_prompt WHERE reading_id = :reading_id")
_INSERT_ALERT_PROMPT = text(
    "INSERT INTO alert_prompt (reading_id, level, threshold_value) VALUES (:reading_id, :level, :threshold_value)"
)


@job("evaluate_thresholds")
def evaluate_thresholds() -> None:
    """Compare the latest river reading against configured thresholds (FR-WX-009).

    **Creates an `alert_prompt`, never an alert.** Publishing to the public
    requires a named officer calling `POST /admin/announcements` — no code path
    connects the two (architecture.md D-4, A-10). Idempotent: at most one prompt
    is ever created per `reading_id`, so a double run within the same reading
    cycle is harmless.
    """
    with engine.begin() as conn:
        row = conn.execute(_LATEST_RIVER_READING).first()
        if row is None:
            log.info("no river reading yet", extra={"job": "evaluate_thresholds"})
            return
        reading_id, value = row

        thresholds = {k: v for k, v in conn.execute(_THRESHOLDS).all()}
        level_1 = thresholds.get("alert.threshold_level_1_m")
        level_2 = thresholds.get("alert.threshold_level_2_m")
        level_3 = thresholds.get("alert.threshold_level_3_m")

        value = float(value)
        if level_3 is not None and value >= float(level_3):
            level, threshold = 3, level_3
        elif level_2 is not None and value >= float(level_2):
            level, threshold = 2, level_2
        elif level_1 is not None and value >= float(level_1):
            level, threshold = 1, level_1
        else:
            log.info("below all thresholds", extra={"job": "evaluate_thresholds", "value": value})
            return

        already = conn.execute(_EXISTING_PROMPT_FOR_READING, {"reading_id": reading_id}).first()
        if already:
            log.info(
                "prompt already exists for this reading", extra={"job": "evaluate_thresholds", "reading_id": reading_id}
            )
            return

        conn.execute(_INSERT_ALERT_PROMPT, {"reading_id": reading_id, "level": level, "threshold_value": float(threshold)})

    log.info(
        "alert_prompt created",
        extra={"job": "evaluate_thresholds", "level": level, "reading_id": reading_id},
    )
