"""Open-Meteo weather adapter (FR-WX-003).

Free, no API key, no signup. One coordinate pair polled every 20 minutes is a
rounding error against the free quota — but it is still polled on a schedule and
cached in `reading`, never called per page view (tech_stack.md Section 7).

Relative imports (`.base`, not `src.integrations.base`) so this file resolves
identically whether it is imported as `src.integrations.open_meteo` (from the API,
which never calls it directly — that would violate D-3) or as `integrations.open_meteo`
(from `services/cron`, which is the only caller). See architecture.md Section 8.1.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import httpx

from .base import Reading, SourceHealth

BASE_URL = "https://api.open-meteo.com/v1/forecast"

# Open-Meteo field name -> our `reading.metric` / unit (schema.md Section 6).
CURRENT_FIELDS = {
    "temperature_2m": ("temperature", "°C"),
    "relative_humidity_2m": ("humidity", "%"),
    "precipitation": ("rainfall", "mm"),
}


class OpenMeteoSource:
    """Implements `DataSource` (FR-WX-001 … FR-WX-006)."""

    name = "open_meteo"

    def __init__(self, *, latitude: float, longitude: float, timeout: float = 15.0) -> None:
        self.latitude = latitude
        self.longitude = longitude
        self.timeout = timeout

    def _get(self) -> dict[str, Any]:
        params = {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "current": ",".join([*CURRENT_FIELDS, "apparent_temperature"]),
            "hourly": "precipitation,precipitation_probability,apparent_temperature",
            "daily": "precipitation_sum,precipitation_probability_max,apparent_temperature_max",
            "forecast_days": 7,
            "timezone": "UTC",
        }
        with httpx.Client(
            timeout=self.timeout,
            headers={"User-Agent": "SAGIP-SJ/0.1 (barangay disaster readiness prototype)"},
        ) as client:
            response = client.get(BASE_URL, params=params)
            response.raise_for_status()
            return response.json()

    def fetch(self) -> list[Reading]:
        """Current conditions only. Raises on failure — the caller logs and skips."""
        payload = self._get()
        current = payload.get("current", {})
        observed_at = datetime.fromisoformat(current["time"]).replace(tzinfo=UTC)

        readings: list[Reading] = []
        for field, (metric, unit) in CURRENT_FIELDS.items():
            value = current.get(field)
            if value is None:
                continue
            readings.append(
                Reading(
                    source=self.name,
                    metric=metric,
                    value=float(value),
                    unit=unit,
                    observed_at=observed_at,
                    raw=current,
                )
            )

        # Heat index is not a native Open-Meteo field — `apparent_temperature`
        # (heat index / wind chill combined) is the closest published proxy.
        apparent = current.get("apparent_temperature")
        if apparent is not None:
            readings.append(
                Reading(
                    source=self.name,
                    metric="heat_index",
                    value=float(apparent),
                    unit="°C",
                    observed_at=observed_at,
                    raw=current,
                )
            )

        return readings

    def fetch_forecast(self) -> list[dict[str, Any]]:
        """Hourly and daily rain/heat-index outlooks for the next seven days.

        Returns plain dicts rather than a typed dataclass — `forecast` has no
        counterpart in `reading` shape (schema.md Section 6 explains why they are
        deliberately separate tables), so the cron job builds `Forecast` rows
        straight from these.
        """
        payload = self._get()
        points: list[dict[str, Any]] = []
        hourly = payload.get("hourly", {})
        hourly_fields = (
            ("precipitation", "rainfall", "mm"),
            ("precipitation_probability", "precipitation_probability", "%"),
            ("apparent_temperature", "heat_index", "Â°C"),
        )
        for i, timestamp in enumerate(hourly.get("time", [])):
            valid_at = datetime.fromisoformat(timestamp).replace(tzinfo=UTC)
            for field, metric, unit in hourly_fields:
                values = hourly.get(field, [])
                if i < len(values) and values[i] is not None:
                    points.append(
                        {
                            "metric": metric,
                            "value": values[i],
                            "unit": unit,
                            "valid_at": valid_at,
                            "horizon": "hourly",
                        }
                    )

        daily = payload.get("daily", {})
        daily_fields = (
            ("precipitation_sum", "rainfall", "mm"),
            ("precipitation_probability_max", "precipitation_probability", "%"),
            ("apparent_temperature_max", "heat_index", "Â°C"),
        )
        for i, timestamp in enumerate(daily.get("time", [])):
            valid_at = datetime.fromisoformat(timestamp).replace(tzinfo=UTC)
            for field, metric, unit in daily_fields:
                values = daily.get(field, [])
                if i < len(values) and values[i] is not None:
                    points.append(
                        {
                            "metric": metric,
                            "value": values[i],
                            "unit": unit,
                            "valid_at": valid_at,
                            "horizon": "daily",
                        }
                    )
        return points

    def health(self) -> SourceHealth:
        try:
            self._get()
            return SourceHealth(
                name=self.name, is_reachable=True, last_success_at=datetime.now(UTC)
            )
        except Exception as exc:  # noqa: BLE001 — health reports, never raises
            return SourceHealth(name=self.name, is_reachable=False, detail=str(exc))
