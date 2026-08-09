"""Rate limiting for sensitive endpoints (FR-SYS-016, NFR-SEC-009).

One `Limiter`, applied per-route with `@limiter.limit(...)`. Login and register
are throttled tightly (10/min, 5/min) — they protect credentials. `POST
/public/rescue-requests` (FR-SAF-008/009) is throttled generously by design,
60/min — it protects a life, and a false positive there means turning away a
real emergency (architecture.md R-11). Keeping the object in one place means
every future sensitive route reads the same policy rather than reinventing it.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
