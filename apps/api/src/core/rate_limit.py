"""Rate limiting for sensitive endpoints (FR-SYS-016, NFR-SEC-009).

One `Limiter`, applied per-route with `@limiter.limit(...)`. Login is throttled
tightly; the public rescue-request endpoint (FR-SAF-009, out of this pass) is
throttled generously by design — a false positive there means turning away a real
emergency (architecture.md R-11). Keeping the object in one place means every
future sensitive route reads the same policy rather than reinventing it.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
