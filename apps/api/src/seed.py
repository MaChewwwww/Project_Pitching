"""Seed data loader — `make seed`.

Reference data is loaded by migration, not at runtime (NFR-DAT-007), so this
module handles only the *demo* dataset: synthetic households marked as such, plus
anything a pitch rehearsal needs.

Nothing here runs automatically. Seeding is an explicit command.

Blocked on the same open items as the schema — see docs/schema.md Section 15:
  - Barangay areas need boundary polygons (BRD OI-3)
  - Hotlines and facilities need the barangay's actual lists
"""

from __future__ import annotations

import asyncio
import logging

from src.core.logging import configure_logging
from src.db.session import SessionLocal, engine

log = logging.getLogger("api.seed")


async def seed() -> None:
    async with SessionLocal() as session:  # noqa: F841 — placeholder until data exists
        log.info("nothing to seed yet — demo data lands with the registry module (FR-REG-*)")
    await engine.dispose()


def main() -> None:
    configure_logging()
    asyncio.run(seed())


if __name__ == "__main__":
    main()
