"""replace the 4 demo evacuation centres with the 14 real ones

The demo dataset shipped four invented evacuation centres transcribed from
`apps/web/src/lib/fixtures/`. `src/seed.py` now carries the real fourteen, but
the seeder is idempotent per-table — it skips any table that already has rows —
so an environment seeded before this migration would keep serving the invented
names indefinitely. This migration is the only thing that moves an
already-populated database onto the real data.

Why a data migration rather than `make clean`: staging holds demo households,
rescue requests and announcements that took a full seed run to generate, and the
pitch depends on them being there. Wiping the volume to fix fourteen rows is a
bad trade.

Three design points worth knowing before editing this:

1. **`area_id` is resolved with `ST_Contains`, not hardcoded.** Same logic as
   `geo.service.area_for_point()`, which is what the admin create-facility path
   uses. A point outside every polygon gets NULL rather than a nearest-area
   guess — `create_facility()` makes the same promise, and a silently wrong area
   would mis-scope every BHW query that filters by it. All fourteen do currently
   land inside a polygon.
2. **`San Jose Elementary School` is UPDATEd, not deleted and reinserted.** The
   name survives the change and only its coordinates move (it was ~800 m off).
   An in-place update keeps the row's UUID, so anything already pointing at it
   still resolves.
3. **Every insert is guarded by `NOT EXISTS`.** On a fresh database the new
   seeder has already inserted all fourteen by the time anyone runs this, and
   without the guard the migration would duplicate them. Same defensive shape as
   `0011_area_boundaries`' `AND geom IS NULL`.

Data is inlined rather than imported from `src.seed_data` / `src.seed` for the
reason given in `0011_area_boundaries`: a migration pins the shape of the world
at one moment, and importing a module that changes independently breaks that.
The duplication is deliberate.

Revision ID: 0015_real_evac_centers
Revises: 0014_tcws_metric
Create Date: 2026-08-10

Refs: FR-EVC-001, FR-EVC-003, FR-MAP-005
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0015_real_evac_centers"
down_revision: str | None = "0014_tcws_metric"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# The invented centres. "San Jose Elementary School" is absent because it is
# relocated in place below rather than removed.
_DROPPED = [
    "San Jose National High School",
    "Barangay Covered Court",
    "San Jose Multi-Purpose Hall",
]

# Where "San Jose Elementary School" used to sit, kept so downgrade() can put it
# back. It was in Area 2 at these coordinates; the real school is in Area 4.
_SJES_OLD_LON = 121.1318
_SJES_OLD_LAT = 14.7371
_SJES_OLD_ADDRESS = "Purok 2, Barangay San Jose"
_SJES_OLD_CONTACT = "(02) 8555-0110"

# (name, address, lon, lat, capacity, notes) — mirrors FACILITY_DEFS and
# EVAC_CENTER_DEFS in src/seed.py. Coordinates are from OpenStreetMap
# (Nominatim + Overpass), reverse-geocode-confirmed to Montalban, Rizal.
# `contact_number` is NULL for all fourteen: none is published, and a
# placeholder would be a fake number on a public page someone might dial in an
# emergency. Capacity is an estimate scaled by facility size — no per-centre
# figure exists anywhere — and every note says so.
_CENTERS: list[tuple[str, str, float, float, int, str]] = [
    (
        "San Jose Elementary School",
        "Barangay San Jose, Rodriguez, Rizal",
        121.134770,
        14.730057,
        500,
        "Ground floor reserved for seniors and persons with disabilities. "
        "Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "San Jose Litex Senior High School",
        "Litex Village, Barangay San Jose, Rodriguez, Rizal",
        121.130018,
        14.735593,
        700,
        "Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "Kasiglahan Elementary School (Main)",
        "Phase 1B, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        121.141590,
        14.748304,
        800,
        "Reportedly the largest enrolment in the Division of Rizal. Estimated "
        "capacity, pending MDRRMO confirmation.",
    ),
    (
        "Kasiglahan Village National High School",
        "Phase 1B, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        121.141548,
        14.749463,
        1200,
        "Largest of the Kasiglahan Village centres. Estimated capacity, pending "
        "MDRRMO confirmation.",
    ),
    (
        "Kasiglahan Village Senior High School",
        "Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        121.143777,
        14.744411,
        800,
        "Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "Colegio De Montalban",
        "Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        121.141636,
        14.750415,
        1000,
        "Tertiary campus with multiple buildings. Estimated capacity, pending "
        "MDRRMO confirmation.",
    ),
    (
        "Phase 1B Covered Court KV1",
        "Phase 1B, Kasiglahan Village 1, Barangay San Jose, Rodriguez, Rizal",
        121.137494,
        14.744080,
        250,
        "Estimated capacity, pending MDRRMO confirmation. Pin is approximate — "
        "a second covered court in Phase 1B is also tagged as a shelter.",
    ),
    (
        "Kasiglahan Elementary School (Unit 1)",
        "Phase 1A, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        121.140167,
        14.744495,
        500,
        "Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "Barangay Annex Phase 1A KV1",
        "Phase 1A, Kasiglahan Village 1, Barangay San Jose, Rodriguez, Rizal",
        121.140840,
        14.744607,
        100,
        "Smallest of the centres. Estimated capacity, pending MDRRMO "
        "confirmation. Pin marks the Phase 1A area, not the building.",
    ),
    (
        "Rodriguez Heights Elementary School",
        "Rodriguez Heights, Barangay San Jose, Rodriguez, Rizal",
        121.123567,
        14.746546,
        450,
        "Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "Phase 1k1 Covered Court",
        "Phase 1K-1, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        121.144138,
        14.743326,
        200,
        "Estimated capacity, pending MDRRMO confirmation. Pin is approximate.",
    ),
    (
        "Phase 1k2 Covered Court",
        "Phase 1K-2, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        121.145849,
        14.740192,
        200,
        "Estimated capacity, pending MDRRMO confirmation. Pin marks the Phase "
        "1K-2 area, not the building.",
    ),
    (
        "Munting Ilaw, Kasiglahan Village",
        "Munting Ilaw, Phase 1D, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        121.138726,
        14.743006,
        200,
        "Has previously sheltered about 160 families. Estimated capacity, "
        "pending MDRRMO confirmation. Pin is at the Munting Ilaw health centre.",
    ),
    (
        "Tagumpay National High School",
        "Pamayanan ng Tagumpay, Barangay San Jose, Rodriguez, Rizal",
        121.131258,
        14.745373,
        900,
        "Serves the Pamayanan ng Tagumpay side. Estimated capacity, pending "
        "MDRRMO confirmation.",
    ),
]

# Resolves the containing area the same way geo.service.area_for_point() does.
# LIMIT 1 because overlapping approximate polygons would otherwise make the
# scalar subquery raise instead of just picking one.
_AREA_FOR_POINT = """(
    SELECT a.id FROM area a
    WHERE a.geom IS NOT NULL
      AND ST_Contains(a.geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
    LIMIT 1
)"""


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Remove the three invented centres. evac_center.facility_id is the only
    #    inbound FK and cascades (0004_operations); facility.area_id points
    #    outward, so nothing is orphaned.
    conn.execute(
        sa.text("DELETE FROM facility WHERE name = ANY(:names) AND type = 'evacuation_center'"),
        {"names": _DROPPED},
    )

    # 2. Relocate San Jose Elementary School, then insert the rest. Both paths
    #    are re-runnable: the UPDATE is idempotent, and the INSERTs no-op when
    #    the seeder already created the row on a fresh database.
    for name, address, lon, lat, capacity, notes in _CENTERS:
        conn.execute(
            sa.text(
                f"""
                UPDATE facility
                SET address        = :address,
                    contact_number = NULL,
                    location       = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                    area_id        = {_AREA_FOR_POINT},
                    updated_at     = now()
                WHERE name = :name AND type = 'evacuation_center'
                """  # noqa: S608 — no interpolation of user input; _AREA_FOR_POINT is a literal
            ),
            {"name": name, "address": address, "lon": lon, "lat": lat},
        )
        conn.execute(
            sa.text(
                f"""
                INSERT INTO facility (
                    name, type, address, contact_number, location, area_id, is_active
                )
                SELECT :name, 'evacuation_center', :address, NULL,
                       ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                       {_AREA_FOR_POINT},
                       true
                WHERE NOT EXISTS (SELECT 1 FROM facility WHERE name = :name)
                """  # noqa: S608
            ),
            {"name": name, "address": address, "lon": lon, "lat": lat},
        )

        # 3. The evac_center row carrying capacity/notes. UPDATE-then-INSERT for
        #    the same reason: the row may already exist from the seeder.
        conn.execute(
            sa.text(
                """
                UPDATE evac_center ec
                SET capacity = :capacity, notes = :notes, is_open = true,
                    contact_number = NULL
                FROM facility f
                WHERE ec.facility_id = f.id AND f.name = :name
                """
            ),
            {"name": name, "capacity": capacity, "notes": notes},
        )
        conn.execute(
            sa.text(
                """
                INSERT INTO evac_center (
                    facility_id, capacity, contact_person, contact_number, is_open, notes
                )
                SELECT f.id, :capacity, NULL, NULL, true, :notes
                FROM facility f
                WHERE f.name = :name
                  AND NOT EXISTS (SELECT 1 FROM evac_center e WHERE e.facility_id = f.id)
                """
            ),
            {"name": name, "capacity": capacity, "notes": notes},
        )

    # 4. Announcement and activity copy named "Barangay Covered Court", which no
    #    longer exists. An evacuation instruction pointing at a centre absent
    #    from the registry is worse than a stale string, so it is corrected here
    #    too — matching the same edit in src/seed.py.
    conn.execute(
        sa.text(
            """
            UPDATE announcement
            SET instruction = 'Go to San Jose Litex Senior High School or Rodriguez Heights '
                              'Elementary School now. Bring your Go Bag, IDs, and medication.'
            WHERE instruction LIKE '%Barangay Covered Court%'
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE activity
            SET venue = 'All puroks — assembly at Phase 1B Covered Court, Kasiglahan Village'
            WHERE venue LIKE '%Barangay Covered Court%'
            """
        )
    )


def downgrade() -> None:
    """Restore the demo shape as closely as a downgrade honestly can.

    The three deleted rows come back with fresh UUIDs — their originals are
    gone, so anything that recorded one will not resolve. The corrected
    announcement and activity copy is also not reverted: it named a centre that
    does not exist in either direction, and restoring a misleading evacuation
    instruction is not a rollback anyone wants.
    """
    conn = op.get_bind()

    # Remove the thirteen added centres; evac_center cascades.
    added = [name for name, *_ in _CENTERS if name != "San Jose Elementary School"]
    conn.execute(
        sa.text("DELETE FROM facility WHERE name = ANY(:names) AND type = 'evacuation_center'"),
        {"names": added},
    )

    # Put San Jose Elementary School back where the demo data had it.
    conn.execute(
        sa.text(
            f"""
            UPDATE facility
            SET address        = :address,
                contact_number = :contact,
                location       = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                area_id        = {_AREA_FOR_POINT},
                updated_at     = now()
            WHERE name = 'San Jose Elementary School' AND type = 'evacuation_center'
            """  # noqa: S608
        ),
        {
            "address": _SJES_OLD_ADDRESS,
            "contact": _SJES_OLD_CONTACT,
            "lon": _SJES_OLD_LON,
            "lat": _SJES_OLD_LAT,
        },
    )
    conn.execute(
        sa.text(
            """
            UPDATE evac_center ec
            SET capacity = 320, is_open = true, contact_number = :contact,
                notes = 'Ground floor reserved for seniors and persons with disabilities.'
            FROM facility f
            WHERE ec.facility_id = f.id AND f.name = 'San Jose Elementary School'
            """
        ),
        {"contact": _SJES_OLD_CONTACT},
    )

    # Recreate the three invented centres at their original coordinates.
    for name, address, contact, lon, lat, capacity, notes in [
        (
            "San Jose National High School",
            "Purok 5, Barangay San Jose",
            "(02) 8555-0111",
            121.1389,
            14.7334,
            450,
            "Largest capacity. Covered parking available for evacuee vehicles.",
        ),
        (
            "Barangay Covered Court",
            "Purok 1, Barangay San Jose",
            None,
            121.1357,
            14.7344,
            180,
            None,
        ),
        (
            "San Jose Multi-Purpose Hall",
            "Purok 7, Barangay San Jose",
            None,
            121.1402,
            14.7318,
            140,
            "Currently closed for roof repair. Reopens once works are complete.",
        ),
    ]:
        conn.execute(
            sa.text(
                f"""
                INSERT INTO facility (
                    name, type, address, contact_number, location, area_id, is_active
                )
                SELECT :name, 'evacuation_center', :address, :contact,
                       ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                       {_AREA_FOR_POINT},
                       true
                WHERE NOT EXISTS (SELECT 1 FROM facility WHERE name = :name)
                """  # noqa: S608
            ),
            {"name": name, "address": address, "contact": contact, "lon": lon, "lat": lat},
        )
        conn.execute(
            sa.text(
                """
                INSERT INTO evac_center (
                    facility_id, capacity, contact_person, contact_number, is_open, notes
                )
                SELECT f.id, :capacity, NULL, :contact,
                       CASE WHEN :name = 'San Jose Multi-Purpose Hall' THEN false ELSE true END,
                       :notes
                FROM facility f
                WHERE f.name = :name
                  AND NOT EXISTS (SELECT 1 FROM evac_center e WHERE e.facility_id = f.id)
                """
            ),
            {"name": name, "capacity": capacity, "contact": contact, "notes": notes},
        )
