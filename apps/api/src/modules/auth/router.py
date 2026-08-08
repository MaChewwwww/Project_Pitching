"""HTTP surface for the auth module (FR-SYS-001 … FR-SYS-004).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from __future__ import annotations

from fastapi import APIRouter, Cookie, Request, Response

from src.core.config import settings
from src.core.deps import CurrentUser
from src.core.rate_limit import limiter
from src.db.session import DbSessionDep
from src.modules.auth import service
from src.modules.auth.schemas import AccessTokenResponse, LoginRequest, MeResponse, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, plaintext: str, max_age_seconds: int) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=plaintext,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=max_age_seconds,
        path=f"{settings.api_v1_prefix}/auth",
    )


@router.post("/login", summary="Log in and receive an access token")
@limiter.limit(
    "10/minute"
)  # FR-SYS-016, NFR-SEC-009 — generous enough for typos, not for brute force
async def login_route(
    request: Request,
    response: Response,
    body: LoginRequest,
    session: DbSessionDep,
) -> AccessTokenResponse:
    access_token, refresh_plaintext, refresh_expires_at, user, _area_ids = await service.login(
        session,
        email=body.email,
        password=body.password,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    _set_refresh_cookie(response, refresh_plaintext, settings.refresh_token_days * 24 * 3600)
    return AccessTokenResponse(
        access_token=access_token, expires_in_minutes=settings.access_token_minutes
    )


@router.post("/register", summary="Create a resident account")
@limiter.limit("5/minute")  # tighter than /login — signup spam, not just typos
async def register_route(
    request: Request,
    response: Response,
    body: RegisterRequest,
    session: DbSessionDep,
) -> AccessTokenResponse:
    access_token, refresh_plaintext, refresh_expires_at, _user = await service.register(
        session,
        email=body.email,
        password=body.password,
        full_name=body.full_name,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    _set_refresh_cookie(response, refresh_plaintext, settings.refresh_token_days * 24 * 3600)
    return AccessTokenResponse(
        access_token=access_token, expires_in_minutes=settings.access_token_minutes
    )


@router.post("/refresh", summary="Exchange the refresh cookie for a new access token")
async def refresh_route(
    response: Response,
    session: DbSessionDep,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
) -> AccessTokenResponse:
    from src.modules.auth.service import InvalidCredentialsError

    if not refresh_token:
        raise InvalidCredentialsError("No active session.")

    access_token, _user = await service.refresh(session, refresh_plaintext=refresh_token)
    return AccessTokenResponse(
        access_token=access_token, expires_in_minutes=settings.access_token_minutes
    )


@router.post("/logout", summary="Revoke the current session")
async def logout_route(
    response: Response,
    session: DbSessionDep,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
) -> dict[str, bool]:
    if refresh_token:
        await service.logout(session, refresh_plaintext=refresh_token, actor_user_id=None)
    response.delete_cookie(REFRESH_COOKIE_NAME, path=f"{settings.api_v1_prefix}/auth")
    return {"ok": True}


@router.get("/me", summary="The authenticated user's own profile")
async def me_route(user: CurrentUser, session: DbSessionDep) -> MeResponse:
    record = await service.get_me(session, user)
    return MeResponse(
        id=record.id,
        email=str(record.email),
        full_name=record.full_name,
        role=record.role,
        status=record.status,
        assigned_area_ids=list(user.assigned_area_ids),
    )
