"""Application assembly: middleware, routers, error handlers, OpenAPI export.

Structure and conventions: docs/architecture.md Sections 4 and 6.
"""

from __future__ import annotations

import json
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from src.core.config import settings
from src.core.errors import register_exception_handlers
from src.core.logging import RequestContextMiddleware, configure_logging
from src.core.rate_limit import limiter
from src.db.session import DbSessionDep, engine

# Each module's router.py declares its own prefix; mounted below under the tier
# that matches who may call it (architecture.md Section 6.2, A-11).
from src.modules.activities.router import admin_router as activities_admin_router
from src.modules.activities.router import public_router as activities_public_router
from src.modules.alerts.router import admin_router as alerts_admin_router
from src.modules.alerts.router import public_router as alerts_public_router
from src.modules.analytics.router import public_router as analytics_public_router
from src.modules.auth.router import router as auth_router
from src.modules.config.router import admin_router as config_admin_router
from src.modules.donations.router import admin_router as donations_admin_router
from src.modules.donations.router import public_router as donations_public_router
from src.modules.evacuation.router import admin_router as evacuation_admin_router
from src.modules.evacuation.router import public_router as evacuation_public_router
from src.modules.geo.router import admin_router as geo_admin_router
from src.modules.geo.router import public_router as geo_public_router
from src.modules.preparedness.router import admin_router as preparedness_admin_router
from src.modules.preparedness.router import public_router as preparedness_public_router
from src.modules.registry.router import admin_router as registry_admin_router
from src.modules.registry.router import me_router as registry_me_router
from src.modules.registry.router import members_admin_router as registry_members_admin_router
from src.modules.safety.router import admin_router as safety_admin_router
from src.modules.safety.router import me_router as safety_me_router
from src.modules.safety.router import public_router as safety_public_router
from src.modules.weather.router import admin_router as weather_admin_router
from src.modules.weather.router import public_router as weather_public_router

log = logging.getLogger("api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging(settings.log_level)
    log.info(
        "api starting",
        extra={"environment": settings.environment, "demo_mode": settings.demo_mode},
    )
    yield
    await engine.dispose()
    log.info("api stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title=f"{settings.app_name} API",
        description=(
            "Barangay San Jose Disaster Readiness & Community Health Platform. "
            "Requirements: docs/frs_nfrs.md"
        ),
        version="0.1.0",
        # /api/docs, not /docs — the proxy routes everything under /api to this app.
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # Outermost: every request gets an ID before anything else can log.
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,  # the refresh cookie has to survive the round trip
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    app.add_middleware(SlowAPIMiddleware)

    # FR-SYS-016, NFR-SEC-009 — login and (later) rescue-request throttling.
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(api_v1)
    return app


# --- health -----------------------------------------------------------------

health_router = APIRouter(tags=["health"])


@health_router.get("/health", summary="Liveness and database status")
async def health(session: DbSessionDep) -> dict[str, str]:
    """App and database status (NFR-OBS-004).

    Served at both `/health` and `/api/v1/health` so a container healthcheck and a
    browser hitting the proxy both reach it.
    """
    try:
        await session.execute(text("SELECT 1"))
        database = "ok"
    except Exception as exc:  # noqa: BLE001 — health must report, never raise
        log.warning("health check: database unreachable", extra={"reason": str(exc)})
        database = "unavailable"

    return {
        "status": "ok",
        "database": database,
        "environment": settings.environment,
        "demo_mode": str(settings.demo_mode).lower(),
    }


# --- API v1 -----------------------------------------------------------------
#
# Split by access tier, not by resource (architecture.md Section 6.2, A-11), so a
# public endpoint cannot accidentally inherit an authenticated one's serializer and
# leak household data.

api_v1 = APIRouter(prefix=settings.api_v1_prefix)

public_router = APIRouter(prefix="/public", tags=["public"])
me_router = APIRouter(prefix="/me", tags=["resident"])
admin_router = APIRouter(prefix="/admin", tags=["admin"])

public_router.include_router(geo_public_router)
public_router.include_router(alerts_public_router)
public_router.include_router(activities_public_router)
public_router.include_router(preparedness_public_router)
public_router.include_router(evacuation_public_router)
public_router.include_router(donations_public_router)
public_router.include_router(weather_public_router)
public_router.include_router(analytics_public_router)
public_router.include_router(safety_public_router)

admin_router.include_router(geo_admin_router)
admin_router.include_router(alerts_admin_router)
admin_router.include_router(activities_admin_router)
admin_router.include_router(preparedness_admin_router)
admin_router.include_router(evacuation_admin_router)
admin_router.include_router(donations_admin_router)
admin_router.include_router(weather_admin_router)
admin_router.include_router(config_admin_router)
admin_router.include_router(registry_admin_router)
admin_router.include_router(registry_members_admin_router)
admin_router.include_router(safety_admin_router)

me_router.include_router(registry_me_router)
me_router.include_router(safety_me_router)

api_v1.include_router(health_router)
api_v1.include_router(auth_router)
api_v1.include_router(public_router)
api_v1.include_router(me_router)
api_v1.include_router(admin_router)

app = create_app()


def _export_openapi() -> None:
    """`make types` entry point — dump the schema to stdout for openapi-typescript."""
    json.dump(app.openapi(), sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    if "--export-openapi" in sys.argv:
        _export_openapi()
    else:
        import uvicorn

        uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)  # noqa: S104
