"""Job instrumentation: structured logging, timing, and failure isolation.

Wrapping every job in `@job` is what makes NFR-OBS-002 true by construction rather
than by everyone remembering to log. It also guarantees rule 3 from `jobs/`:
a raised exception is logged and swallowed, so one broken job never stops the
scheduler or the other five.
"""

from __future__ import annotations

import functools
import json
import logging
import sys
import time
from collections.abc import Callable
from typing import Any, TypeVar

F = TypeVar("F", bound=Callable[..., Any])


class JsonFormatter(logging.Formatter):
    """Same single-line JSON shape the API emits, so both containers grep alike."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key in ("job", "outcome", "duration_ms", "written", "reason", "source", "level", "reading_id", "value"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())
    logging.getLogger("apscheduler").setLevel("WARNING")


def job(name: str) -> Callable[[F], F]:
    """Log start, outcome, and duration; never let a failure escape."""

    def decorator(func: F) -> F:
        log = logging.getLogger(f"cron.{name}")

        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            log.info("job started", extra={"job": name})
            started = time.perf_counter()
            try:
                result = func(*args, **kwargs)
            except Exception:
                log.exception(
                    "job failed",
                    extra={
                        "job": name,
                        "outcome": "failure",
                        "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                    },
                )
                # Swallowed on purpose. The next run tries again; a failing job must
                # never take the scheduler down with it.
                return None

            log.info(
                "job finished",
                extra={
                    "job": name,
                    "outcome": "success",
                    "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                },
            )
            return result

        return wrapper  # type: ignore[return-value]

    return decorator
