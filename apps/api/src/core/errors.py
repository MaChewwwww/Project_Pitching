"""One exception handler, one error shape.

RFC 7807-style envelope per docs/architecture.md Section 6.1:

    { "type": ..., "title": ..., "status": ..., "detail": ..., "errors": [...] }

Internals never reach the client. An unhandled exception logs the traceback and
returns a generic 500 carrying only the request ID, which is what a user should
quote when reporting a problem.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.core.logging import request_id_ctx

log = logging.getLogger("api.error")

# A relative URI, which RFC 7807 permits. Absolute would mean baking in a domain
# we do not have and an app name that is still an open item (BRD OI-1).
PROBLEM_BASE = "/errors"


class AppError(Exception):
    """Base for errors a service raises deliberately.

    Services raise these; routers do not catch them. The handler below turns them
    into the envelope so no route has to remember the shape.
    """

    status_code: int = status.HTTP_400_BAD_REQUEST
    error_type: str = "application-error"
    title: str = "Request could not be completed"

    def __init__(self, detail: str, *, errors: list[dict] | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        self.errors = errors or []


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    error_type = "not-found"
    title = "Resource not found"


class PermissionDeniedError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    error_type = "permission-denied"
    title = "Not permitted"


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    error_type = "conflict"
    title = "Conflicts with existing data"


class ValidationError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_type = "validation-failed"
    title = "Validation failed"


def _problem(
    *,
    status_code: int,
    error_type: str,
    title: str,
    detail: str,
    errors: list[dict] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "type": f"{PROBLEM_BASE}/{error_type}",
            "title": title,
            "status": status_code,
            "detail": detail,
            "errors": errors or [],
            "request_id": request_id_ctx.get(),
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return _problem(
            status_code=exc.status_code,
            error_type=exc.error_type,
            title=exc.title,
            detail=exc.detail,
            errors=exc.errors,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return _problem(
            status_code=exc.status_code,
            error_type="http-error",
            title=str(exc.detail),
            detail=str(exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        # 422 with field-level detail (architecture.md Section 6.1).
        errors = [
            {
                "field": ".".join(str(part) for part in error["loc"][1:]) or str(error["loc"][0]),
                "message": error["msg"],
                "code": error["type"],
            }
            for error in exc.errors()
        ]
        return _problem(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_type="validation-failed",
            title="Validation failed",
            detail="One or more fields are invalid.",
            errors=errors,
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        log.exception(
            "unhandled exception",
            extra={"method": request.method, "path": request.url.path},
        )
        return _problem(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_type="internal-error",
            title="Something went wrong",
            # Deliberately says nothing about the cause. The request ID in the
            # envelope is how this gets traced back to the logged traceback.
            detail="An unexpected error occurred. Quote the request ID when reporting this.",
        )
