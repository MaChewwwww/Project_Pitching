"""FastAPI dependencies: authentication, role checks, and area scoping.

Authorization lives here and nowhere else (architecture.md Section 7.2):

  1. authentication  — `CurrentUser`
  2. role            — `require_role("admin", "bhw")` as a router dependency
  3. area scope      — `apply_area_scope(...)` in the data layer, as a query filter

Never in a service, never in the frontend. A route that forgets the area filter
leaks the whole barangay, so the filter is a function services call by default
rather than a condition someone has to remember.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Annotated

import jwt
from fastapi import Depends, Request

from src.core.errors import PermissionDeniedError
from src.core.security import decode_token
from src.db.session import DbSessionDep

# BRD 5.1 lists six roles. `public` is the absence of a user, so it is not stored
# and never appears as a claim (schema.md Section 3).
ROLES = ("head", "bhw", "admin", "sk", "superadmin")

# Re-exported so a router imports everything it needs from one place.
DbSession = DbSessionDep


class UnauthenticatedError(PermissionDeniedError):
    status_code = 401
    error_type = "unauthenticated"
    title = "Authentication required"


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    id: uuid.UUID
    role: str
    assigned_area_ids: tuple[uuid.UUID, ...] = field(default=())

    @property
    def is_area_scoped(self) -> bool:
        """A BHW sees only their assigned areas (FR-SYS-007). Everyone else sees all."""
        return self.role == "bhw"


def _bearer_token(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthenticatedError("Missing or malformed Authorization header.")
    return token


async def get_current_user(request: Request) -> AuthenticatedUser:
    """Decode the access token into a user. 401 on anything wrong.

    Area assignments are not in the token — they are loaded from `user_area` when a
    scoped query needs them, so revoking an assignment takes effect immediately
    rather than at the next token refresh.
    """
    try:
        payload = decode_token(_bearer_token(request), expected_type="access")
    except jwt.PyJWTError as exc:
        raise UnauthenticatedError("Invalid or expired access token.") from exc

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise UnauthenticatedError("Token is missing a valid subject.") from exc

    role = payload.get("role")
    if role not in ROLES:
        raise UnauthenticatedError("Token carries an unknown role.")

    return AuthenticatedUser(id=user_id, role=role)


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


def require_role(*allowed: str):
    """Router dependency enforcing role membership (FR-SYS-006).

        @router.get("/households", dependencies=[Depends(require_role("admin", "bhw"))])

    `superadmin` passes every check without being listed on each route.
    """
    unknown = set(allowed) - set(ROLES)
    if unknown:
        raise ValueError(f"Unknown role(s) in require_role: {sorted(unknown)}")

    async def _check(user: CurrentUser) -> AuthenticatedUser:
        if user.role != "superadmin" and user.role not in allowed:
            raise PermissionDeniedError(
                "Your account does not have permission to perform this action."
            )
        return user

    return _check


def apply_area_scope(query, user: AuthenticatedUser, area_column, /):
    """Restrict a query to the areas a BHW is assigned to.

    Applied in the data layer, never in the router. Pass the model's area column:

        query = apply_area_scope(query, user, Household.area_id)

    A BHW with no assigned areas sees nothing, which is the correct failure
    direction — an unassigned account must not fall through to seeing everything.
    """
    if not user.is_area_scoped:
        return query
    return query.where(area_column.in_(user.assigned_area_ids))


def with_area_assignments(
    user: AuthenticatedUser, area_ids: Sequence[uuid.UUID]
) -> AuthenticatedUser:
    """Return a copy of `user` carrying their `user_area` rows."""
    return AuthenticatedUser(id=user.id, role=user.role, assigned_area_ids=tuple(area_ids))
