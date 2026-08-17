# Migrations

Alembic only. **No manual DDL, ever** (NFR-MNT-004) — a schema change applied by hand exists on
one machine and nowhere else, and is discovered on demo day.

The columns themselves are in [`docs/schema.md`](../../../docs/schema.md). This file is about
the workflow.

## Everyday use

```bash
make revision m="add household and member"   # generate from model changes
make migrate                                 # apply
```

Migrations also run automatically when the API container starts, so `make dev` always leaves you
on `head` (`architecture.md` Section 13.3).

```bash
make shell-api                       # then:
alembic current                      # where am I
alembic history --verbose            # what exists
alembic downgrade -1                 # undo one
```

## The trap that will cost you a table

Autogenerate compares `Base.metadata` against the live database. `Base.metadata` only contains
models that something **imported**.

So a model nobody imports looks, to Alembic, exactly like a table that should not exist — and it
generates `op.drop_table()`. Against a development database that is an annoyance; against seeded
demo data the evening before a pitch it is not.

**Every `models.py` must be imported in `src/db/models_registry.py`.** That file exists for no
other reason.

> **Always read the generated migration before applying it.** Autogenerate is a first draft. If
> you see a `drop_table` you did not ask for, you forgot the registry import — fix that rather
> than deleting the line.

## Things autogenerate gets wrong here

| Situation                   | What happens                                                                    | Do this                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **PostGIS internal tables** | `spatial_ref_sys` and friends look like unknown tables                          | Already filtered by `include_object` in `alembic/env.py`. Leave it alone                   |
| **Partial indexes**         | `postgresql_where` is often not detected as a change                            | Write the index by hand in the migration                                                   |
| **`DESC` in an index**      | Not expressible through `op.create_index`                                       | Use `op.execute("CREATE INDEX ... (col DESC)")`, as `0001_foundation` does for `audit_log` |
| **CHECK constraints**       | Detected inconsistently                                                         | Declare them in `__table_args__` **and** verify they appear in the migration               |
| **Extensions**              | Never detected                                                                  | `op.execute("CREATE EXTENSION IF NOT EXISTS ...")`, first migration only                   |
| **Type changes**            | `compare_type=True` is on, but Postgres will still refuse some in-place changes | Check the generated SQL against a copy of real data                                        |

## Conventions

- **Constraint names come from the naming convention** in `src/db/base.py`. That is what makes a
  migration reversible — an unnamed constraint gets a server-generated name that `downgrade()`
  cannot reference.
- **Name every `CheckConstraint`.** The convention is `ck_%(table_name)s_%(constraint_name)s`,
  so an unnamed one produces an unusable name.
- **`TIMESTAMPTZ` only.** Never `TIMESTAMP` — it silently drops the offset, which turns a flood
  timeline into fiction a few hours later.
- **Write `downgrade()` properly.** CI runs `downgrade base` then `upgrade head` on every API
  change. A migration nobody can undo is a migration nobody dares to fix.
- **One migration per PR** where you can. Two migrations that both alter one table will conflict
  the moment they are merged in the other order.

## Seed data

Reference data is loaded **by migration**, not at runtime (NFR-DAT-007) — `0001_foundation`
seeds the legacy `config` defaults and area reference rows this way. Runtime operational values
are now supplied by the environment profile (`BARANGAY_TOTAL_*`, `ALERT_THRESHOLD_LEVEL_*_M`,
and `STALE_THRESHOLD_MINUTES`). Open items remain SQL `null` in the legacy table rather than
being guessed: a wrong alert threshold is worse than an obviously missing one.

Demo data is different. It goes through `src/seed.py`, is explicitly marked synthetic, and
**does load automatically** — right after migration, on every API container start
(`architecture.md` Section 13.3). Each section checks its own table's row count first, so this
is a no-op after the first run. `make seed` is only there for an explicit manual re-run.

The weather seed preserves the verified PAGASA Montalban river snapshot as five historical
readings plus a relative current snapshot. The historical timestamps stay fixed for the trend
view; the current snapshot is offset from seed time so a reset database does not immediately
display stale river data.

### Flood-history demo story

`src/seed.py` keeps researched history separate from the live-looking demo. The three closed
historical `EmergencyEvent` / `FloodEvent` pairs use the following provenance and scope:

| Seed record                                        | What the source supports                                                                                                         | Deliberately left `NULL`                                                      |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Typhoon Ondoy (Ketsana), 26 Sep 2009               | TAO-Pilipinas documents Kasiglahan Village Phase 1-D, Barangay San Jose as submerged.                                            | Peak level/time, displaced-household count, approximate-area links            |
| Typhoon Ulysses (Vamco), 12–14 Nov 2020            | Sentinel Times reports 3,363 families / 15,591 people in Rodriguez evacuation centres; this is municipal, not Barangay San Jose. | Peak level/time, Barangay San Jose displacement count, approximate-area links |
| Habagat and Tropical Storm Crising, 20–24 Jul 2025 | DSWD records the Wawa Dam critical-spilling response and evacuations in Rodriguez.                                               | Peak level/time, Barangay San Jose displacement count, approximate-area links |

The active `DEMO SIMULATION — Flood Response Exercise` is the only open event. Its 23.8 m
peak, 58 displaced households, linked Areas 1/2/4, people, household details, pins, sirens,
rescue requests, and incident reports are fictional training data and say so in their notes.
Historical `NULL` values are intentional: the public chart excludes unknown measurements rather
than displaying them as zero. The seed creates no evacuation check-ins and no incident images.

The scenario ledger is deliberately broad enough to exercise every operational workspace: 1,000
synthetic BHW-assisted households / 3,820 members across six approximate areas; 850 distinct,
contained household pins and 150 address-complete location-pending records; nine clearly labelled
simulated sirens (three sounding); 420 registered safe rows plus 12 needing-rescue rows; 12 walk-in
records (8 safe, 4 needing rescue); 18 rescue requests; and 14 incident reports. These counts are
asserted by `tests/test_seed_integrity.py`; the database schema summary links back here from
[`docs/schema.md`](../../../docs/schema.md#15-seed-data).

The references above are retained here so a future seed edit can re-check its factual scope:
[TAO-Pilipinas](https://www.tao-pilipinas.org/ypp_files/2011ypenews_augsep.pdf),
[Sentinel Times](https://www.sentineltimes.net/2020/11/more-than-15k-individuals-are-still-in.html),
and [DSWD](https://www.dswd.gov.ph/dswd-chief-assures-continuous-relief-support-for-evacuees-during-rounds-in-metro-manila-rizal/).

`seed.py` only creates this operational ledger when the corresponding tables are empty. If an
operator has entered an emergency event or any safety/operations data, it leaves those records
untouched instead of blending this exercise with user-managed work.

## When a migration is already merged

Do not edit it. Write a new one. Editing a merged migration means anyone who already ran it has
a database that no longer matches the file, and nothing will tell them.

## Retiring data-bearing tables

Migration `0018_article_cms` removes the former donation and assistance transaction tables under
D-16. Its downgrade restores their shape but cannot restore retired rows. Take and verify a
database backup before applying any migration that removes data-bearing tables; use that backup
for recovery rather than a schema downgrade.

## Article CMS follow-up migrations

`0019_rm_article_image_meta` removes `alt_text` and `caption` from the announcement, activity, and
donation-drive image tables. The API and frontend intentionally do not collect those fields; the
gallery contract is limited to file path, order, cover selection, and timestamps.

`0020_merge_article_migrations` is a no-op merge that joins the article-image metadata head with
`0019_remove_announcement_level`. Keep the merge revision as the single Alembic head; do not edit
either parent migration after it has been applied.

`0021_household_number_format` rewrites existing household references into the canonical
`M-SJ-000-000` Household Number format, then advances `household_reference_no_seq` past the
rewritten rows. It is a data migration, so review the generated identifiers before applying it to
an environment with non-demo registry data.

`0022_member_contact_number` adds the nullable contact field used by registered citizen profiles.
Existing members remain valid with no contact number; new BHW member entries carry the optional
value into the citizen directory.

`0023_concurrent_emergency_operations` removes the singleton-active-event restriction, preserves
the one-physical-place-per-person invariant across events, and adds the walk-in fields/conversion
link needed by the event-scoped response workflow. `0024_incident_action_lifecycle` adds the
resolution fields and database checks for the verified → in-progress → resolved lifecycle.

`0025_operational_asset_lifecycle` and `0026_siren_soft_delete` complete the manual siren
simulation lifecycle: active state, last trigger time, the `testing` status, area index, and
recoverable removal. They do not add physical IoT integration.

`0027_resident_portal_foundations` adds the authenticated rescue link, resident Go Bag catalogue
and progress, one household family-emergency plan, and user-scoped notification records. It is the
schema base for the completed Resident Portal flow; route ownership remains in
[`modules.md`](./modules.md) and the physical columns in
[`docs/schema.md`](../../../docs/schema.md).
