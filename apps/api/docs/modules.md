# Modules

The API is a **modular monolith**: one deployable application, boundaries enforced by directory
and import discipline rather than by network calls. Five people on a competition timeline do not
need service boundaries — they need to not trip over each other
([`architecture.md`](../../../docs/architecture.md) D-5, A-1).

## The four files

Every module in `src/modules/` has the same four, and they do not swap jobs:

| File         | Does                                                                                 | Must not                                                                |
| ------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `router.py`  | Declares HTTP routes, applies auth dependencies, calls a service, returns its result | Touch the database. Contain business logic. Decide authorization itself |
| `schemas.py` | Pydantic request/response models — the API contract                                  | Contain ORM models                                                      |
| `service.py` | Business logic, transaction boundaries, audit writes                                 | Import another module's `models.py`                                     |
| `models.py`  | SQLAlchemy ORM                                                                       | Invent columns not in `schema.md`                                       |

A fifth file is fine when a module grows (`selectors.py`, `permissions.py`). Four is the floor,
not the ceiling.

## Why routers stay thin

A router that queries directly is a router that can forget the area-scope filter, and a BHW who
should see 40 households sees 1,284. Keeping the query in the service means the filter lives in
one place per resource instead of one place per route.

The same reasoning drives rule 2. If `donations/service.py` queries `registry`'s `Household`
model directly, then a change to how households are soft-deleted has to be found in every module
that reached in. Going through `registry`'s service means it is found in one.

## Where things go when it is not obvious

| Logic                                   | Home                          | Why                                        |
| --------------------------------------- | ----------------------------- | ------------------------------------------ |
| Scoring a household's vulnerability     | `domain/vulnerability.py`     | Pure, heavily tested, no I/O (NFR-MNT-005) |
| Loading the household to score          | `modules/registry/service.py` | Needs a session                            |
| Deciding whether this user may score it | `core/deps.py`                | Authorization lives in one place           |
| Formatting the score for a response     | `modules/registry/schemas.py` | Contract, not logic                        |
| Fetching a river level from PAGASA      | `services/cron`               | **Never** in a request path (D-3)          |
| Parsing PAGASA's HTML                   | `integrations/pagasa.py`      | One file to fix when the markup changes    |

If it needs a database session it is not `domain/`. If it makes an outbound HTTP call it is not
in `apps/api` at all.

## Adding a module

1. Create the package with the four files. Docstrings state the FR range it covers.
2. Mount the router in `src/main.py`, under the right **access tier** — `/public`, `/me`, or
   `/admin`. Tiers are split so a public route cannot inherit an authenticated route's
   serializer and leak household data (`architecture.md` A-11).
3. **Import the new `models.py` in `src/db/models_registry.py`.** Skip this and Alembic
   autogenerate will not see the models, and will emit a migration that drops the tables. See
   [`migrations.md`](./migrations.md).
4. Generate the migration, review it by hand, apply it.
5. `make types` and commit the regenerated `packages/api-types/src/generated.ts`.
6. Update `frs_nfrs.md` Status in the same PR.

## Access tiers

```
/api/v1/public/*    no auth — the entire public site
/api/v1/me/*        authenticated resident
/api/v1/admin/*     admin, BHW, SK — role-checked per route
```

Routes are grouped by _who may call them_, not by resource. A resource that is readable publicly
and writable by an admin appears in both tiers, with **different response schemas**. That is the
point: the public serializer physically cannot return a contact number, because it has no field
for one.

## Alerts and announcements

`src/modules/alerts/` is the reference content module for future portal-managed articles. Its
`router.py` exposes public list/detail/active reads and role-checked admin list/detail/create/update,
image, ordering, and deactivation operations; `schemas.py` defines separate public and admin DTOs;
`service.py` owns publication validation, ordered gallery rules, deactivation filtering, threshold
prompt acknowledgement/deletion rules, and audit writes; `models.py` maps the announcement,
prompt, and entity-specific image tables.

The admin DELETE route is deliberately a soft deactivation (`deactivated_at`), never a physical
delete. Public list, detail, and active-banner queries exclude deactivated rows. Publication status
is `draft`, `published`, or `archived`; only published rows enter public lists, while article detail
may expose an archived history entry when it is not deactivated. Image metadata is intentionally
minimal: file path, order, cover flag, and timestamps—there are no alt-text or caption fields.

When adding another article-like module, mirror this router → schema → service → model split and the
same public/admin lifecycle instead of coupling a new page directly to persistence.

## Activities and preparedness guides

Activities support an optional public `type` filter while retaining the upcoming-only default. The
admin delete route owns its audit write and removes the article's uploaded files after its database
transaction succeeds. Preparedness guides use a distinct admin response so publication state is never
lost in the public serializer; published guide writes require source attribution and a review date.

## Weather and flood-history lifecycle

`src/modules/weather/` owns both the cached weather/readings surface and FR-WX-013 flood history.
Keep the public and admin flood-event serializers separate: `PublicFloodEvent` exposes the
resident-safe history, while `AdminFloodEvent` adds `area_ids` so the editor can restore the exact
many-to-many selection. The admin service replaces `flood_event_area` links in one transaction when
an event is edited; an empty selection means that the extent was not recorded.

Emergency Event-linked flood records are lifecycle-owned by the emergency module. Admins may edit
their historical context, but the weather service rejects deletion with a conflict; manual records
delete their area links and emit the `flood_event.delete` audit action. Keep the authorization and
404/409 behavior in the router/service contract when changing this flow.

## Registry workspaces and lifecycle

The admin registry has two read models: household rows (`GET /admin/households`) and enriched citizen
rows (`GET /admin/members`). The static `/admin/members/summary` route must remain before the dynamic
member route. Citizen detail includes the full household snapshot; `/activity` separates person-linked
safety and evacuation records from household-linked rescue requests and reports so the console never
implies that contextual records belong to one person. Detail serializers include household context so the web console does not
need a second PII join. The summary endpoint is area-scoped and derives counts at request time; no
coverage totals are stored.

Household references are displayed and generated as `M-SJ-000-000` Household Numbers. The registry
sequence remains database-backed and race-safe; the seed loader reserves its synthetic range before
the first live registration.

The BHW household endpoint creates every added member as an active citizen in the same transaction.
The household head's birthday and sex, plus each added member's birthday, sex, and relationship, are
required; member contact numbers remain optional and are returned in the enriched citizen directory.

All profile mutations go through `registry/service.py` and write an audit event. BHW requests are
restricted to assigned areas for both the source and destination of a transfer. A linked resident head
cannot be moved, demoted, archived, or renamed through the registry; a registry-managed head must be
replaced with `POST /admin/members/{id}/make-head` before archive or transfer. `POST /admin/members/{id}/promote`
creates a new BHW-assisted household while retaining the member UUID and downstream history. Promotion
requires an exact address, a selected waterway proximity, and a pin that resolves inside the selected
San Jose area; a missing contact number derives the household's no-contact state rather than blocking it.

Household map pins resolve through `GET /public/areas/resolve-point`, which checks the PostGIS
boundaries and returns the matching area plus a coarse Barangay San Jose address label. It does not
call an external reverse-geocoder. Registry writes reject pins outside San Jose or pins whose
selected area disagrees with the boundary match; synthetic seed households use a point on their
assigned area polygon for the same reason.

## Concurrent emergency operations

`evacuation/service.py` owns event resolution and physical center occupancy. `list_active_events`
is ordered newest-first; `require_active_event(event_id)` rejects ended selections, and its legacy
no-ID path returns `409` when more than one event is active. Occupancy queries never filter to one
event: the partial unique indexes on `evac_checkin` make each registered member or walk-in one
physical occupant even while several emergencies are active.

`safety/service.py` owns event-specific status history and the PII workspace projection. The
workspace applies BHW area scope before loading rosters. SK users reach only the aggregate
Accounted For route. Center assignment from a safety write delegates to evacuation with commit
deferred so whole-household acknowledgement and check-in changes remain one transaction.

Rescue requests and incident reports have a separate, admin-only operational worklist. Their
list serializers enrich a pin with its containing area and linked event metadata; their detail
routes project `audit_log` into a history timeline. Incident lifecycle writes are constrained in
the service and again by database checks, so a resolved report cannot exist without a completion
note. This workflow records the acting administrator rather than introducing an assignment role.

Admin/BHW safety writes may carry the field-recorded status time for blackout recovery. It is
stored on the append-only safety row (`set_at`); the normal database `created_at` timestamp is
never rewritten. When the same write assigns an evacuation center, its physical check-in uses
that field time too so the two response timelines do not disagree.

Walk-in conversion remains registry-owned. Registry creates the official member/household, then
calls safety to transfer current status and evacuation identity before the single commit. The
unregistered row is retained with both conversion FKs and excluded from live walk-in totals.

## The registry module will get big

## Operational asset lifecycle

Facilities, evacuation centers, and sirens are registry records, not disposable
map markers. Their admin `DELETE` operations deactivate the record; public
queries return active assets only. Reactivation is explicit and audited. An
evacuation center with open check-ins cannot be deactivated. Admin center writes
carry the linked facility identity and pin in one transaction so a map pin and
capacity record cannot drift apart. Spatial writes resolve the area from the
submitted point and reject pins outside Barangay San Jose.

36 requirements land in `registry` — it is the module most likely to become a monolith inside
the monolith (`architecture.md` AR-1). Split it internally from the start: `household`,
`members`, `nutrition`, `vulnerability`, `feedback`. Keep the classification logic in
`domain/vulnerability.py`, where it stays pure and testable.
