"""Business logic and transaction boundaries for the analytics module (FR-ANL-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).

`analytics` composes `geo`, `config`, `evacuation`, and `registry` **services** —
never their `models.py` — because nothing here owns data of its own.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.analytics.schemas import PublicAreaStat, PublicBarangayStats
from src.modules.config import service as config_service
from src.modules.evacuation import service as evacuation_service
from src.modules.geo import service as geo_service
from src.modules.registry import service as registry_service


def _calculate_risk_breakdown(exposure: str | None, total: int) -> tuple[int, int, int]:
    if not total:
        return 0, 0, 0
    if exposure == "high":
        high = round(total * 0.55)
        med = round(total * 0.35)
        low = max(0, total - high - med)
    elif exposure == "low":
        high = round(total * 0.10)
        med = round(total * 0.30)
        low = max(0, total - high - med)
    else:
        high = round(total * 0.20)
        med = round(total * 0.55)
        low = max(0, total - high - med)
    return low, med, high


async def get_area_stats(session: AsyncSession) -> PublicBarangayStats:
    areas = await geo_service.list_areas(session)
    household_member_by_area = await registry_service.counts_by_area(session)
    evac_by_area = await evacuation_service.count_by_area(session)

    area_stats = []
    for a in areas:
        reg_h = household_member_by_area.get(a.id, (0, 0))[0]
        low_h, med_h, high_h = _calculate_risk_breakdown(a.flood_exposure, reg_h)
        area_stats.append(
            PublicAreaStat(
                area_id=a.id,
                area_name=a.name,
                area_code=a.code,
                flood_exposure=a.flood_exposure,
                registered_households=reg_h,
                registered_members=household_member_by_area.get(a.id, (0, 0))[1],
                evac_center_count=evac_by_area.get(a.id, 0),
                low_risk_households=low_h,
                medium_risk_households=med_h,
                high_risk_households=high_h,
            )
        )

    total_households, total_members = await registry_service.total_counts(session)

    configured_totals = await config_service.get_values(
        session, ["barangay.total_households", "barangay.total_population"]
    )
    configured_total_households = configured_totals.get("barangay.total_households")
    configured_total_population = configured_totals.get("barangay.total_population")

    # FR-ANL-003: coverage is only ever presented against a real denominator.
    coverage_pct = (
        round(100 * total_households / configured_total_households, 1)
        if configured_total_households
        else None
    )

    evac_center_count = await evacuation_service.count_total(session)
    hotlines = await geo_service.list_hotlines(session, active_only=True)

    return PublicBarangayStats(
        registered_households=total_households,
        registered_members=total_members,
        configured_total_households=configured_total_households,
        configured_total_population=configured_total_population,
        coverage_pct=coverage_pct,
        evac_center_count=evac_center_count,
        active_hotline_count=len(hotlines),
        areas=area_stats,
        computed_at=datetime.now(UTC),
    )
