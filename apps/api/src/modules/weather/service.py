"""Business logic and transaction boundaries for the weather module (FR-WX-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.config import settings
from src.core.errors import ConflictError, NotFoundError
from src.core.pagination import Page, page_meta
from src.modules.weather.models import FloodEvent, FloodEventArea, Forecast, Reading
from src.modules.weather.schemas import (
    AdminFloodEvent,
    FloodEventIn,
    ManualReadingIn,
    PublicFloodEvent,
    PublicForecastPoint,
    PublicReading,
    PublicRiverLevel,
    PublicWeatherCurrent,
    RiverHistoryPoint,
    RiverThresholds,
    SimulateTyphoonResult,
)

CURRENT_METRICS = ("temperature", "rainfall", "humidity", "heat_index")

DEFAULT_STALE_MINUTES = 45
LOCAL_WEATHER_ZONE = ZoneInfo("Asia/Manila")


def _stale_after_minutes() -> int:
    return settings.stale_threshold_minutes or DEFAULT_STALE_MINUTES


def _to_public(r: Reading, *, stale_after_minutes: int, now: datetime) -> PublicReading:
    age = max(0, int((now - r.observed_at).total_seconds() // 60))
    return PublicReading(
        id=r.id,
        source=r.source,  # type: ignore[arg-type]
        metric=r.metric,  # type: ignore[arg-type]
        value=r.value,
        unit=r.unit,
        station=r.station,
        observed_at=r.observed_at,
        fetched_at=r.fetched_at,
        age_minutes=age,
        is_stale=age > stale_after_minutes,
        stale_after_minutes=stale_after_minutes,
    )


async def _latest_reading(session: AsyncSession, metric: str) -> Reading | None:
    stmt = (
        select(Reading)
        .where(Reading.metric == metric)
        .order_by(Reading.observed_at.desc())
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def _highest_reading_today(
    session: AsyncSession, metric: str, *, now: datetime
) -> Reading | None:
    """Return today's peak metric using the barangay's local calendar day."""
    local_start = now.astimezone(LOCAL_WEATHER_ZONE).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    stmt = (
        select(Reading)
        .where(
            Reading.metric == metric,
            Reading.observed_at >= local_start.astimezone(UTC),
            Reading.observed_at <= now,
        )
        .order_by(Reading.value.desc(), Reading.observed_at.desc())
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_weather_current(session: AsyncSession) -> PublicWeatherCurrent:
    stale_after = _stale_after_minutes()
    now = datetime.now(UTC)

    readings: list[PublicReading] = []
    for metric in CURRENT_METRICS:
        row = await _latest_reading(session, metric)
        if row is not None:
            readings.append(_to_public(row, stale_after_minutes=stale_after, now=now))

    peak_readings: list[PublicReading] = []
    for metric in ("rainfall", "heat_index"):
        row = await _highest_reading_today(session, metric, now=now)
        if row is not None:
            peak_readings.append(_to_public(row, stale_after_minutes=stale_after, now=now))

    current_hour = now.replace(minute=0, second=0, microsecond=0)
    # Open-Meteo daily points are calendar-day values. Use the barangay's local
    # date so the Daily view includes "today" through the UTC/PHT boundary.
    local_day = now.astimezone(LOCAL_WEATHER_ZONE).date()
    current_day = datetime.combine(local_day, datetime.min.time(), tzinfo=UTC)
    forecast_rows = (
        (
            await session.execute(
                select(Forecast)
                .where(
                    or_(
                        (Forecast.horizon == "hourly") & (Forecast.valid_at >= current_hour),
                        (Forecast.horizon == "daily") & (Forecast.valid_at >= current_day),
                    )
                )
                .order_by(Forecast.horizon, Forecast.valid_at, Forecast.metric)
                .limit(600)
            )
        )
        .scalars()
        .all()
    )
    forecast = [
        PublicForecastPoint(
            valid_at=f.valid_at,
            metric=f.metric,  # type: ignore[arg-type]
            value=f.value,
            unit=f.unit,
            horizon=f.horizon,  # type: ignore[arg-type]
            source=f.source,  # type: ignore[arg-type]
            fetched_at=f.fetched_at,
        )
        for f in forecast_rows
    ]

    if not readings:
        return PublicWeatherCurrent(
            readings=[],
            peak_readings=peak_readings,
            observed_at=None,
            source=None,
            is_stale=False,
            forecast=forecast,
        )

    observed_at = max(r.observed_at for r in readings)
    # Dominant source: whichever source produced the most of the current readings.
    sources = [r.source for r in readings]
    source = max(set(sources), key=sources.count)
    return PublicWeatherCurrent(
        readings=readings,
        peak_readings=peak_readings,
        observed_at=observed_at,
        source=source,
        is_stale=any(r.is_stale for r in readings),
        forecast=forecast,
    )


def _alert_level(value: float | None, thresholds: RiverThresholds | None) -> int:
    if value is None or thresholds is None:
        return 0
    if thresholds.level_3_m is not None and value >= thresholds.level_3_m:
        return 3
    if thresholds.level_2_m is not None and value >= thresholds.level_2_m:
        return 2
    if thresholds.level_1_m is not None and value >= thresholds.level_1_m:
        return 1
    return 0


async def get_river_level(session: AsyncSession) -> PublicRiverLevel:
    stale_after = _stale_after_minutes()
    now = datetime.now(UTC)

    row = await _latest_reading(session, "river_level")
    reading = _to_public(row, stale_after_minutes=stale_after, now=now) if row else None

    raw_thresholds = {
        "alert.threshold_level_1_m": settings.alert_threshold_level_1_m,
        "alert.threshold_level_2_m": settings.alert_threshold_level_2_m,
        "alert.threshold_level_3_m": settings.alert_threshold_level_3_m,
    }
    has_any = any(v is not None for v in raw_thresholds.values())
    thresholds = (
        RiverThresholds(
            level_1_m=raw_thresholds.get("alert.threshold_level_1_m"),
            level_2_m=raw_thresholds.get("alert.threshold_level_2_m"),
            level_3_m=raw_thresholds.get("alert.threshold_level_3_m"),
        )
        if has_any
        else None
    )

    return PublicRiverLevel(
        reading=reading,
        alert_level=_alert_level(reading.value if reading else None, thresholds),  # type: ignore[arg-type]
        thresholds=thresholds,
        is_stale=reading.is_stale if reading else False,
        # The read path always returns the most recent reading regardless of age
        # (architecture.md 8.2) — "current" and "last known good" are the same row
        # unless a fetch has failed and this endpoint simply keeps serving it.
        last_known_good=reading,
    )


async def reading_to_public(session: AsyncSession, reading: Reading) -> PublicReading:
    stale_after = _stale_after_minutes()
    return _to_public(reading, stale_after_minutes=stale_after, now=datetime.now(UTC))


async def get_river_history(session: AsyncSession, hours: int) -> list[RiverHistoryPoint]:
    """Return river_level readings for the past `hours` hours, ordered ASC.

    For windows > 24 h we bucket by hour (latest reading per hour) to keep
    the payload small; for short windows every reading is returned as-is.
    The caller controls the window via the `hours` query param (max 168).
    """
    hours = min(max(hours, 1), 168)
    since = datetime.now(UTC) - timedelta(hours=hours)

    stmt = (
        select(Reading)
        .where(
            Reading.metric == "river_level",
            Reading.observed_at >= since,
        )
        .order_by(Reading.observed_at.asc())
    )
    rows = list((await session.execute(stmt)).scalars().all())

    # For 7-day windows downsample: keep the latest reading per clock-hour
    if hours > 24 and len(rows) > 200:
        bucketed: dict[tuple[int, int, int, int], Reading] = {}
        for row in rows:
            key = (
                row.observed_at.year,
                row.observed_at.month,
                row.observed_at.day,
                row.observed_at.hour,
            )
            # Overwrite keeps the latest in the hour (rows are ASC)
            bucketed[key] = row
        rows = sorted(bucketed.values(), key=lambda r: r.observed_at)

    return [
        RiverHistoryPoint(
            observed_at=r.observed_at,
            value=r.value,
            source=r.source,  # type: ignore[arg-type]
        )
        for r in rows
    ]


async def record_manual_reading(
    session: AsyncSession, data: ManualReadingIn, *, actor_id: uuid.UUID
) -> Reading:
    """FR-WX-007 — a barangay officer's reading is a first-class source, not a
    fallback bolted on afterwards (architecture.md Section 8.3)."""
    reading = Reading(
        source="manual",
        metric=data.metric,
        value=data.value,
        unit=data.unit,
        observed_at=data.observed_at or datetime.now(UTC),
        entered_by_user_id=actor_id,
    )
    session.add(reading)
    await session.flush()

    # A manual river reading follows the same human-review path as scheduled
    # readings. Crossing a configured tier creates a deduplicated prompt; it
    # never creates or publishes a public announcement automatically.
    if data.metric == "river_level":
        from src.modules.alerts import service as alerts_service

        thresholds = RiverThresholds(
            level_1_m=settings.alert_threshold_level_1_m,
            level_2_m=settings.alert_threshold_level_2_m,
            level_3_m=settings.alert_threshold_level_3_m,
        )
        level = _alert_level(data.value, thresholds)
        crossed_threshold = {
            1: thresholds.level_1_m,
            2: thresholds.level_2_m,
            3: thresholds.level_3_m,
        }.get(level)
        if crossed_threshold is not None:
            await alerts_service.create_alert_prompt_if_new(
                session,
                reading_id=reading.id,
                level=level,
                threshold_value=crossed_threshold,
            )

    await write_audit(
        session,
        actor_user_id=actor_id,
        action="reading.manual_entry",
        entity_type="reading",
        entity_id=None,
        changes={"metric": data.metric, "value": data.value},
    )
    await session.commit()
    return reading


async def simulate_typhoon(session: AsyncSession, *, actor_id: uuid.UUID) -> SimulateTyphoonResult:
    """An on-demand, presenter-triggered river-level sequence for the pitch.

    This is deliberately **not** FR-WX-016 (a scripted timeline replayed by a
    job). It is FR-WX-007 manual entry, called several times in a row: four
    real `reading` rows, `source='manual'`, rising through Alert Levels 1, 2,
    and 3 relative to whatever thresholds are actually configured right now —
    never hardcoded absolute values, so a change to the service-owned configuration
    changes what "crossing a tier" means here too. See tech_stack.md Section 7
    (follow-up note) for why this replaced FR-WX-016 as the plan.

    Alert prompts are created synchronously via `alerts_service` so they are
    visible on `/admin/alert-prompts` the moment this call returns — a
    presenter should not have to wait for cron's next tick mid-pitch.
    """
    from src.modules.alerts import service as alerts_service

    level_1 = settings.alert_threshold_level_1_m
    level_2 = settings.alert_threshold_level_2_m
    level_3 = settings.alert_threshold_level_3_m
    if level_1 is None or level_2 is None or level_3 is None:
        raise NotFoundError(
            "River alert thresholds are not fully configured yet — set "
            "ALERT_THRESHOLD_LEVEL_1_M/2_M/3_M in the deployment environment "
            "before simulating a typhoon (schema.md S-OI-3)."
        )

    now = datetime.now(UTC)
    # (minutes into the past, river level, rainfall mm, humidity %) — oldest
    # first, so the most recent row is genuinely the "current" reading every
    # other endpoint reads by observed_at DESC.
    steps = [
        (12, round(level_1 * 0.9, 2), 8.0, 82.0),
        (9, round(level_1 + 0.1, 2), 18.0, 88.0),
        (6, round(level_2 + 0.1, 2), 32.0, 93.0),
        (3, round(level_3 + 0.2, 2), 45.0, 97.0),
    ]

    thresholds = RiverThresholds(level_1_m=level_1, level_2_m=level_2, level_3_m=level_3)
    readings: list[Reading] = []
    prompts_created = 0
    highest_level = 0

    for minutes_ago, river_level, rainfall_mm, humidity_pct in steps:
        observed_at = now - timedelta(minutes=minutes_ago)

        river_reading = Reading(
            source="manual",
            metric="river_level",
            value=river_level,
            unit="m",
            station="Simulated typhoon (demo)",
            observed_at=observed_at,
            entered_by_user_id=actor_id,
        )
        session.add(river_reading)
        await session.flush()
        readings.append(river_reading)

        for metric, value, unit in (
            ("rainfall", rainfall_mm, "mm"),
            ("humidity", humidity_pct, "%"),
        ):
            aux = Reading(
                source="manual",
                metric=metric,
                value=value,
                unit=unit,
                observed_at=observed_at,
                entered_by_user_id=actor_id,
            )
            session.add(aux)
            readings.append(aux)

        level = _alert_level(river_level, thresholds)
        highest_level = max(highest_level, level)
        crossed_threshold = {1: level_1, 2: level_2, 3: level_3}.get(level)
        if crossed_threshold is not None:
            prompt = await alerts_service.create_alert_prompt_if_new(
                session,
                reading_id=river_reading.id,
                level=level,
                threshold_value=crossed_threshold,
            )
            if prompt is not None:
                prompts_created += 1

    await write_audit(
        session,
        actor_user_id=actor_id,
        action="reading.simulate_typhoon",
        entity_type="reading",
        entity_id=None,
        changes={"steps": len(steps), "highest_alert_level": highest_level},
    )
    await session.commit()

    stale_after = _stale_after_minutes()
    public_readings = [
        _to_public(r, stale_after_minutes=stale_after, now=datetime.now(UTC)) for r in readings
    ]
    return SimulateTyphoonResult(
        readings=public_readings,
        alert_prompts_created=prompts_created,
        highest_alert_level=highest_level,  # type: ignore[arg-type]
    )


# --- flood events (FR-WX-013) --------------------------------------------------


async def _flood_area_data(
    session: AsyncSession, event_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[tuple[uuid.UUID, str]]]:
    if not event_ids:
        return {}
    from src.modules.geo.models import Area

    rows = (
        await session.execute(
            select(FloodEventArea.flood_event_id, Area.id, Area.name)
            .join(Area, FloodEventArea.area_id == Area.id)
            .where(FloodEventArea.flood_event_id.in_(event_ids))
        )
    ).all()
    out: dict[uuid.UUID, list[tuple[uuid.UUID, str]]] = {eid: [] for eid in event_ids}
    for event_id, area_id, name in rows:
        out[event_id].append((area_id, name))
    return out


async def list_flood_events(
    session: AsyncSession, *, page: int = 1, size: int = 20
) -> Page[PublicFloodEvent]:
    stmt = select(FloodEvent).order_by(FloodEvent.started_at.desc())
    total = len((await session.execute(stmt)).all())
    rows = (await session.execute(stmt.limit(size).offset((page - 1) * size))).scalars().all()
    area_data = await _flood_area_data(session, [e.id for e in rows])
    items = [
        PublicFloodEvent(
            id=e.id,
            emergency_event_id=e.emergency_event_id,
            name=e.name,
            started_at=e.started_at,
            ended_at=e.ended_at,
            is_ongoing=e.ended_at is None,
            peak_level_m=e.peak_level_m if e.peak_level_m is not None else None,
            peak_at=e.peak_at,
            households_displaced=e.households_displaced,
            notes=e.notes,
            area_names=[name for _, name in area_data.get(e.id, [])],
        )
        for e in rows
    ]
    return Page[PublicFloodEvent](items=items, **page_meta(total, page, size))


async def list_admin_flood_events(session: AsyncSession) -> Page[AdminFloodEvent]:
    """Return history records with area ids for the admin editor only."""
    stmt = select(FloodEvent).order_by(FloodEvent.started_at.desc())
    rows = (await session.execute(stmt.limit(100))).scalars().all()
    area_data = await _flood_area_data(session, [event.id for event in rows])
    items = [
        AdminFloodEvent(
            id=event.id,
            emergency_event_id=event.emergency_event_id,
            name=event.name,
            started_at=event.started_at,
            ended_at=event.ended_at,
            is_ongoing=event.ended_at is None,
            peak_level_m=event.peak_level_m,
            peak_at=event.peak_at,
            households_displaced=event.households_displaced,
            notes=event.notes,
            area_ids=[area_id for area_id, _ in area_data.get(event.id, [])],
            area_names=[name for _, name in area_data.get(event.id, [])],
        )
        for event in rows
    ]
    return Page[AdminFloodEvent](items=items, **page_meta(len(rows), 1, 100))


async def create_flood_event(
    session: AsyncSession, data: FloodEventIn, *, actor_id: uuid.UUID
) -> FloodEvent:
    event = FloodEvent(
        emergency_event_id=data.emergency_event_id,
        name=data.name,
        started_at=data.started_at,
        ended_at=data.ended_at,
        peak_level_m=data.peak_level_m,
        peak_at=data.peak_at,
        households_displaced=data.households_displaced,
        notes=data.notes,
    )
    session.add(event)
    await session.flush()
    for area_id in data.area_ids:
        session.add(FloodEventArea(flood_event_id=event.id, area_id=area_id))
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="flood_event.create",
        entity_type="flood_event",
        entity_id=event.id,
    )
    await session.commit()
    return event


async def update_flood_event(
    session: AsyncSession, event_id: uuid.UUID, data: FloodEventIn, *, actor_id: uuid.UUID
) -> FloodEvent:
    event = await session.get(FloodEvent, event_id)
    if event is None:
        raise NotFoundError("Flood event not found.")
    if data.emergency_event_id is not None:
        event.emergency_event_id = data.emergency_event_id
    event.name = data.name
    event.started_at = data.started_at
    event.ended_at = data.ended_at
    event.peak_level_m = data.peak_level_m
    event.peak_at = data.peak_at
    event.households_displaced = data.households_displaced
    event.notes = data.notes

    existing = (
        (
            await session.execute(
                select(FloodEventArea).where(FloodEventArea.flood_event_id == event_id)
            )
        )
        .scalars()
        .all()
    )
    for row in existing:
        await session.delete(row)
    await session.flush()
    for area_id in data.area_ids:
        session.add(FloodEventArea(flood_event_id=event.id, area_id=area_id))

    await write_audit(
        session,
        actor_user_id=actor_id,
        action="flood_event.update",
        entity_type="flood_event",
        entity_id=event.id,
    )
    await session.commit()
    return event


async def delete_flood_event(
    session: AsyncSession, event_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    """Delete a manually recorded history item and its area associations."""
    event = await session.get(FloodEvent, event_id)
    if event is None:
        raise NotFoundError("Flood event not found.")
    if event.emergency_event_id is not None:
        raise ConflictError(
            "Auto-synced flood events are managed through their linked Emergency Event "
            "and cannot be deleted here."
        )

    await session.delete(event)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="flood_event.delete",
        entity_type="flood_event",
        entity_id=event_id,
    )
    await session.commit()


async def create_flood_event_from_emergency(
    session: AsyncSession,
    *,
    emergency_event_id: uuid.UUID,
    name: str,
    started_at: datetime,
) -> FloodEvent:
    """Auto-creates a linked FloodEvent when a flood/typhoon EmergencyEvent is declared."""
    event = FloodEvent(
        emergency_event_id=emergency_event_id,
        name=name,
        started_at=started_at,
        notes="Auto-created from active Emergency Event",
    )
    session.add(event)
    await session.flush()
    return event


async def finalize_flood_event_from_emergency(
    session: AsyncSession,
    *,
    emergency_event_id: uuid.UUID,
    ended_at: datetime,
) -> FloodEvent | None:
    """Finalizes a linked FloodEvent when the EmergencyEvent is ended."""
    stmt = select(FloodEvent).where(FloodEvent.emergency_event_id == emergency_event_id)
    event = (await session.execute(stmt)).scalar_one_or_none()
    if event is None:
        return None

    event.ended_at = ended_at

    # Find highest river reading recorded between started_at and ended_at
    from sqlalchemy import func

    peak_stmt = (
        select(Reading)
        .where(
            Reading.metric == "river_level",
            Reading.observed_at >= event.started_at,
            Reading.observed_at <= ended_at,
        )
        .order_by(Reading.value.desc())
        .limit(1)
    )
    peak_reading = (await session.execute(peak_stmt)).scalar_one_or_none()
    if peak_reading is not None:
        event.peak_level_m = peak_reading.value
        event.peak_at = peak_reading.observed_at

    # Compute displaced count from evac checkins if available
    try:
        from src.modules.evacuation.models import EvacCheckin

        evac_stmt = select(func.count(func.distinct(EvacCheckin.member_id))).where(
            EvacCheckin.event_id == emergency_event_id
        )
        evac_count = (await session.execute(evac_stmt)).scalar() or 0
        if evac_count > 0 and event.households_displaced is None:
            event.households_displaced = evac_count
    except Exception:
        pass

    return event
