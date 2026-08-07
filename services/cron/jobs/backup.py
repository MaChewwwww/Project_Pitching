"""Database backup (NFR-AVL-005)."""

from __future__ import annotations

import logging

from runner import job

log = logging.getLogger("cron.backup")


@job("backup_database")
def backup_database() -> None:
    """Daily `pg_dump` to a second location.

    Not yet implemented. The manual path exists today — `make backup` and
    `make restore` wrap `infra/scripts/`.

    **Restore must be verified at least once before the pitch** (NFR-AVL-006).
    An untested backup is not a backup.
    """
    log.info("not implemented")
