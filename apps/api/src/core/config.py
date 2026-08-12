"""Application settings.

Everything is environment-driven (docs/architecture.md Section 13.2) so the same
image runs on a laptop and on the VPS with nothing but a different `.env`.
Keys here must match `.env.example` at the repo root.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
        case_sensitive=False,
    )

    # --- identity -----------------------------------------------------------
    app_name: str = "[APP_NAME]"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"

    # --- database -----------------------------------------------------------
    database_url: str = "postgresql+psycopg://app:app_dev_password@db:5432/appdb"

    # --- auth ---------------------------------------------------------------
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 14

    # False on plain HTTP. A Secure cookie is silently dropped over HTTP, which
    # looks exactly like a broken login (tech_stack.md Section 9).
    cookie_secure: bool = False

    # --- http ---------------------------------------------------------------
    # NoDecode stops pydantic-settings from JSON-parsing the env var before the
    # validator below sees it — an env var is a comma-separated string, not JSON.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:8080"]
    )

    # --- external data ------------------------------------------------------
    open_meteo_lat: float = 14.735
    open_meteo_lon: float = 121.135
    pagasa_station: str = "Montalban"
    scrape_interval_minutes: int = 15

    # A reading older than this renders as stale (FR-WX-011).
    stale_threshold_minutes: int = 45

    # --- barangay operational configuration -------------------------------
    # These values used to be edited through the retired /admin/config screen.
    # Keep them in the deployment profile so a profile change is explicit and
    # reproducible across local, staging, and demo environments.
    barangay_total_population: int | None = 143031
    barangay_total_households: int | None = None
    alert_threshold_level_1_m: float | None = 22.40
    alert_threshold_level_2_m: float | None = 23.00
    alert_threshold_level_3_m: float | None = 23.60

    # --- uploads ------------------------------------------------------------
    upload_dir: str = "/uploads"
    max_upload_mb: int = 5

    # --- operations ---------------------------------------------------------
    log_level: str = "INFO"

    # Switches readings to a scripted timeline for the pitch (FR-WX-016).
    demo_mode: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        """Accept a comma-separated string, which is what an env var gives us."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def sync_database_url(self) -> str:
        """Alembic runs synchronously; psycopg3 serves both drivers under one URL."""
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
