# Technology Stack

**Project:** Barangay San Jose Disaster Readiness & Community Health Platform
**Companion to:** `business-requirements.md`
**Version:** 0.1 (Draft) · **Date:** August 2026

> **Scope note.** This document lists _what tools we use and why_. How the system is structured — services, data model, API design, deployment topology — belongs in `architecture.md`.

> **Version numbers.** Where versions appear they indicate the major line, not a pin. Confirm the current stable release at install time.

---

## 1. Decisions at a Glance

| Layer                    | Choice                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Frontend                 | Next.js (App Router) + TypeScript                                                                              |
| Styling                  | Tailwind CSS + shadcn/ui                                                                                       |
| Backend                  | FastAPI (Python 3.12+)                                                                                         |
| Database                 | PostgreSQL + **PostGIS**                                                                                       |
| Auth                     | Custom JWT issued by FastAPI                                                                                   |
| 2D / hazard map          | Leaflet + OpenStreetMap                                                                                        |
| 3D showpiece map         | Three.js via React Three Fiber                                                                                 |
| Containerization         | Docker + Docker Compose                                                                                        |
| Deployment               | Single VPS (public IP, no domain); identical Compose stack runs locally                                        |
| Reverse proxy            | Caddy — plain HTTP. Optional one-line switch to HTTPS via sslip.io (Section 9)                                 |
| Location & photo capture | Manual by default — draggable map pin, gallery upload. GPS and camera are progressive enhancements (Section 9) |
| Scheduled jobs           | Dedicated cron container                                                                                       |
| Weather data             | Open-Meteo                                                                                                     |
| Hazard overlay           | Project NOAH — pre-clipped to San Jose, served as a static file                                                |
| River level              | PAGASA FFWS scraper **with manual fallback**                                                                   |

---

## 2. Frontend

### Core

| Tool                     | Purpose           | Notes                                                                                                                                               |
| ------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js** (App Router) | Framework         | Server Components for the public site, client components for the maps and dashboards                                                                |
| **TypeScript**           | Type safety       | Non-negotiable on a team where several members are new to the codebase — the compiler catches what code review will not                             |
| **Tailwind CSS**         | Styling           |                                                                                                                                                     |
| **shadcn/ui**            | Component library | Components are copied into your repo, not installed as a dependency. Install the full set up front as planned — unused ones cost nothing at runtime |

### Data & forms

| Tool                          | Purpose              | Notes                                                                                                                                                                          |
| ----------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TanStack Query**            | Server state         | Handles caching, refetching, and loading/error states. **Add this even though you planned on plain axios** — the alternative is hand-rolling the same logic across ~15 screens |
| **axios**                     | HTTP client          | Sits underneath TanStack Query. One configured instance with the JWT interceptor                                                                                               |
| **React Hook Form** + **Zod** | Forms and validation | The registration form (M1) has many conditional fields per member; this pairing keeps it manageable                                                                            |
| **Zod**                       | Schema validation    | Also used to parse API responses so a backend change surfaces as a clear error rather than `undefined`                                                                         |

### UI support

| Tool             | Purpose                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Recharts**     | Analytics charts (M10)                                                                                           |
| **lucide-react** | Icons (ships with shadcn/ui)                                                                                     |
| **date-fns**     | Date formatting and relative times ("updated 2 hours ago" — needed for BR-3.8 data staleness)                    |
| **next-intl**    | Filipino/English content (BR-0.19)                                                                               |
| **Zustand**      | Small amount of global client state — active emergency banner, map layer toggles. Skip if React Context suffices |

### Mapping — two libraries, two jobs

| Tool                                            | Purpose                              | Notes                                                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Leaflet** + **react-leaflet**                 | Hazard and facility map (M2, BR-0.9) | Small, stable, easy. Renders GeoJSON polygons and pins with almost no setup                                                                                                                                       |
| **OpenStreetMap** tiles                         | Basemap                              | Free. **Attribution is required, and OSM's tile policy discourages heavy traffic** — fine at prototype scale. If usage grows, switch to Carto or Stadia free tiers, which is a one-line URL change                |
| **Three.js** + **React Three Fiber** + **drei** | Stylized 3D San Jose (M2 showpiece)  | Use React Three Fiber rather than raw Three.js — declarative React components instead of imperative scene management, and `drei` supplies camera controls and lighting helpers you would otherwise write yourself |

> **Why two maps and not one.** They answer different questions. Leaflet answers _"where is the nearest evacuation center and is my street in a flood zone?"_ — it needs real coordinates, a real basemap, and correct geometry. Three.js answers _"which part of the barangay needs help most?"_ — it needs visual impact and does not need geographic precision (BR-2.8 already states boundaries are approximate). Forcing one library to do both means either an ugly showpiece or a hand-built mapping engine.

---

## 3. Backend

| Tool                            | Purpose                      | Notes                                                                                                                    |
| ------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **FastAPI**                     | Web framework                | Auto-generated OpenAPI docs at `/docs` — useful for the team, and worth showing judges as evidence of engineering rigour |
| **Python 3.12+**                | Runtime                      |                                                                                                                          |
| **Pydantic v2**                 | Validation and serialization | Built into FastAPI                                                                                                       |
| **SQLAlchemy 2.0**              | ORM                          |                                                                                                                          |
| **Alembic**                     | Database migrations          | Essential the moment more than one person runs the project                                                               |
| **GeoAlchemy2**                 | PostGIS types in SQLAlchemy  | Lets you store and query area polygons and household points through the ORM                                              |
| **Uvicorn** + **Gunicorn**      | ASGI server                  | Uvicorn workers managed by Gunicorn in production                                                                        |
| **httpx**                       | Outbound HTTP                | Async client for Open-Meteo and the PAGASA scraper                                                                       |
| **PyJWT** + **passlib[argon2]** | Custom auth                  | See Section 5                                                                                                            |
| **pytest** + **pytest-asyncio** | Testing                      |                                                                                                                          |
| **ruff**                        | Lint and format              | One tool replacing flake8, isort, and black                                                                              |

### One-time data preparation (developer tooling, not runtime)

| Tool                           | Purpose                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **GeoPandas** + **Shapely**    | Clip the Project NOAH province shapefile down to Barangay San Jose (Section 6)                       |
| **QGIS** _(desktop, optional)_ | Visual alternative to the above — easier if nobody on the team is comfortable with geospatial Python |

---

## 4. Database

**PostgreSQL 16 + PostGIS.**

PostGIS is the reason to choose Postgres here rather than anything else, and it is not optional:

- Household geotags are points; barangay areas are polygons. `ST_Contains` assigns a household to its area automatically instead of asking the resident to self-select and getting it wrong.
- Flood hazard zones are polygons. "Which registered households sit inside the 100-year flood zone?" is one spatial query, not an export to a spreadsheet.
- BR-2.2 (areas shaded by aggregated vulnerability/risk indicators) is a spatial aggregation.

Doing this without PostGIS means computing point-in-polygon in Python on every request.

| Tool                   | Purpose                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL 16**      | Primary datastore                                                                                                                                                                                       |
| **PostGIS 3.4**        | Spatial types, indexes, and functions                                                                                                                                                                   |
| **Redis** _(optional)_ | Cache for weather and river readings. Skip initially — a `last_fetched_at` column and a short TTL in application code is enough at this scale. Add it only if the API starts hammering upstream sources |

File uploads (incident photos, BR-5.6) go to a Docker volume served by the reverse proxy. Object storage is unnecessary at this scale.

---

## 5. Authentication — Custom JWT

You chose to own this. That is workable, but the pieces below are not optional, because rolling your own auth badly is the most common way student projects get compromised.

| Concern          | Approach                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password hashing | **argon2** via `passlib`. Never bcrypt-by-hand, never SHA-anything                                                                                                    |
| Token type       | Short-lived access token (~15 min) + longer refresh token                                                                                                             |
| Token storage    | Refresh token in an **httpOnly, Secure, SameSite cookie** — not `localStorage`, which is readable by any injected script. **`Secure` requires HTTPS** — see Section 9 |
| Roles            | Six roles from BRD 5.1 as a claim in the token; **authorization enforced server-side on every endpoint**, never by hiding UI                                          |
| Area scoping     | BHW access is limited to assigned areas (BR-1.44) — enforced as a query filter in the data layer, not a UI condition                                                  |
| Password reset   | Token emailed via a transactional provider free tier (Resend, Brevo), or barangay-admin-initiated reset if email is more trouble than it is worth                     |
| Rate limiting    | **slowapi** on login and rescue-request endpoints                                                                                                                     |

> **Reconsider if time gets tight.** Auth is invisible when it works and catastrophic when it does not, and it demos exactly the same either way. If R-8 (scope overrun) starts to bite, this is the single best candidate to swap for a managed service — Supabase Auth or Better Auth would return several days to the schedule and no judge would notice.

---

## 6. Hazard Data — Project NOAH

LiPAD and Project NOAH publish the _same underlying data_ — both are products of the DOST-funded UP DREAM / Phil-LiDAR programmes. LiPAD is the archive and distribution portal; NOAH is the public viewer built on top of it. Choosing between them is about packaging, not quality.

**Decision: BetterGov / NOAH province shapefiles.** LiPAD's municipality-level downloads were the first choice — smaller and better documented — but the downloads came through corrupted in practice. The province-level files work, and the extra size is absorbed entirely by the one-time clipping step below.

**In use:**

```
dataset/Rizal_Flood_5year.shp   .shx   .dbf   .prj   .xml
```

| Property       | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| CRS            | WGS84 / EPSG:4326 (confirm via `.prj`) — **no reprojection needed** |
| Hazard classes | `1` Low (0–0.5 m) · `2` Medium (0.5–1.5 m) · `3` High (>1.5 m)      |
| Also present   | "Area Assessed" and "Area Not Assessed" polygons — filter these out |
| Licence        | ODC-ODbL — attribution mandatory, derivatives inherit the licence   |
| Sidecar        | `.xml` carries the metadata; keep it with the source data           |

> **Take all three return periods** (5, 25, 100-year) if the downloads cooperate. Together they carry an argument a single layer cannot: _"this area floods in a 5-year event — roughly every five years, not once in a lifetime."_ If only one is available, 5-year is arguably the strongest for the pitch, because it describes something residents have actually lived through.

> **Keep all five sidecar files together.** A `.shp` without its `.shx`, `.dbf`, and `.prj` is unreadable — this is the most common cause of "corrupted shapefile" errors. If a download fails, re-fetch the whole set rather than the single file.

### Recommended approach: clip once, ship a static file

Barangay San Jose is a tiny fraction of one province. Do the reduction **offline, once**, and commit the result:

1. Start from `dataset/Rizal_Flood_<period>.shp` with all sidecar files present.
2. Confirm the CRS is EPSG:4326 and inspect the attribute table for the hazard field.
3. Filter to hazard classes 1–3, dropping "Area Not Assessed".
4. Clip to the San Jose boundary, **dissolve by hazard level**, then simplify.
5. Export GeoJSON with coordinates rounded to 6 decimals — expect a few hundred KB, down from hundreds of MB.
6. Commit it and serve as a static asset; Leaflet renders it with the official colour ramp (`design.md` 3.4).

> **Dissolving by level is the biggest size win** — it collapses thousands of small polygons into three multipolygons. Do it before simplifying.

**Why this is the right call:**

- **No runtime dependency.** NOAH being slow or offline on competition day cannot affect you.
- **Leaflet-compatible.** PMTiles vector tiles need MapLibre GL; plain GeoJSON does not, so your map library choice stands.
- **Fast.** A few hundred KB loads instantly on a phone (BR-0.16).
- **Honest.** These are historical model outputs that do not change. Fetching them live would imply a currency they do not have.

**Attribution is mandatory** — ODC-ODbL requires crediting Project NOAH, and any derivative you distribute must carry the same licence. Put it in the map footer and the About section.

> **Alternative if you switch to MapLibre later:** the PMTiles files can be streamed directly from HuggingFace with the `pmtiles` protocol plugin, no download at all. Noted for completeness; not the recommended path given Leaflet.

---

## 7. Real-Time Data

### Open-Meteo — weather (BR-3.1, BR-0.4)

Free for non-commercial use, **no API key, no signup**, up to ~10,000 calls/day. Plain HTTP GET returning JSON. Hourly and daily forecasts up to 16 days, including precipitation and probability.

Poll on a schedule and cache — do not call it per page view. One barangay needs one coordinate pair polled every 15–30 minutes, which is a rounding error against the free quota.

### PAGASA — river level (BR-3.2) · **the genuinely hard one**

**There is no public API.** The Pasig-Marikina-Tullahan FFWS publishes water level and rainfall through a web interface intended for humans. Getting it programmatically means scraping.

| Consideration        | Position                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legality / etiquette | A government public-information page. Scrape **politely** — identify your user agent, poll no more than every 10–15 minutes, cache aggressively, back off on errors. Do not hammer it |
| Fragility            | Any markup change breaks the parser without warning                                                                                                                                   |
| Availability         | The site is under heaviest load during exactly the events you need it for                                                                                                             |

**Design accordingly — three layers, in this order:**

1. **Scraper adapter.** Isolated behind one interface so a broken parser is a one-file fix, not a refactor.
2. **Manual override — build this first.** A barangay admin can enter the current river level directly. BR-3.3 already makes thresholds configurable; this extends the same principle to the reading. It is genuinely how the barangay works today, it makes the system usable when the scrape fails, and it is a few hours of work.
3. **Last-known-good with visible staleness.** BR-3.8 requires provenance and timestamps on every reading, and stale data must be visibly marked. Never show a number without saying how old it is.

> **For the demo, use seeded data on a scripted timeline.** A live scrape failing mid-pitch is an avoidable risk, and a flood scenario you control tells the story better than whatever the river happens to be doing that morning. Say plainly that it is simulated — judges respect that more than a fragile live call.
>
> **Decision taken (Aug 2026): always fetch live, fall back to last-known-good on failure**,
> rather than a `DEMO_MODE` scripted timeline. FR-WX-016 stays unimplemented and `☐` under this
> decision. The risk above is accepted, not mitigated — FR-WX-012 (last-known-good with visible
> age) and FR-WX-007 (manual entry) are what keep a PAGASA outage from blanking the page during
> the pitch. Revisit before demo day; flipping to scripted data is a one-flag change, not a
> redesign, if the live dependency proves too risky in rehearsal.
>
> **Follow-up (Aug 2026): the isolated `demo` Compose profile plus a "Simulate typhoon" admin
> action cover the actual need this was for**, at a fraction of FR-WX-016's cost. The `demo`
> profile (`architecture.md` Section 13.1) keeps a curated database separate from `staging`'s
> live experiments, and `POST /admin/readings/simulate-typhoon` gives a presenter an on-demand,
> real rising river-level sequence — crossing all three configured alert tiers, creating the
> matching `alert_prompt`s immediately — without building a scripted-timeline format or a job to
> play it back. It is FR-WX-007 manual entry, called several times in a row.

### Resolved — T-OI-1: FFWS exposes JSON, no scraper needed

Checked directly (Aug 2026): `GET https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/map_list.do`
returns a plain JSON array — **not HTML** — for all 16 Pasig-Marikina-Tullahan gauges, including
`Montalban` (14.7331, 121.1306) and `Rodriguez`, both within a few hundred metres of the
`OPEN_METEO_LAT`/`LON` centroid already in `.env.example`. Each row carries:

```json
{
  "obsnm": "Montalban",
  "lon": 121.1306,
  "lat": 14.7331,
  "ymdhm": null,
  "timestr": null,
  "wl": null,
  "alertwl": "22.40",
  "alarmwl": "23.00",
  "criticalwl": "23.60",
  "icon": "nodata"
}
```

`wl` (current water level) is `null` outside active flood events — the gauge only reports a
reading when there is water to report. That is not a parser failure; it is the expected idle
state, and the adapter must log it as "no new reading" and write nothing rather than erroring.
`alertwl`/`alarmwl`/`criticalwl` map directly onto FR-WX-005's three tiers and are seeded into
`config` (`schema.md` S-OI-3).

**Consequence: no HTML parser, no new dependency.** `httpx.get(...).json()` is the entire fetch;
`PagasaSource` in `apps/api/src/integrations/pagasa.py` needs no BeautifulSoup/selectolax. The
"scrape politely" guidance above (identified UA, ≥10 min interval, backoff) still applies — this
is still a public-information endpoint, not a documented API, and it can change without notice.

> **Gotcha that cost an hour: the FFWS server never sends its intermediate TLS
> certificate.** `openssl s_client -showcerts` against the host returns only the
> leaf (`*.pagasa.dost.gov.ph`) — verify code 21, "unable to verify the first
> certificate". Browsers hide this by fetching the intermediate via the
> certificate's AIA extension automatically; `httpx`/Python's `ssl` module does
> not, so every fetch failed `CERTIFICATE_VERIFY_FAILED` — deterministically,
> not intermittently, which would have quietly turned "always fetch live" into
> "always fall back to manual" everywhere this runs. `pagasa.py` bundles the
> missing intermediate (GlobalSign GCC R46 OV TLS CA 2025, valid until
> 2029-06-23) and verifies against it explicitly, rather than disabling
> certificate verification — this is a public-internet fetch to a government
> site and a MITM there is a real, not theoretical, concern.

**`pagasa-parser`** (`pagasa.chlod.net`, `github.com/pagasa-parser`) was considered and is **not
a substitute**. Its ten repositories parse PAGASA **tropical cyclone bulletins** (PDF/XML → JSON,
storm-signal maps, Wikipedia tables) — there is no river-gauge or FFWS functionality anywhere in
the org. It is a legitimate future option for FR-WX-015 (typhoon advisories, `Could` priority,
currently `☐`), at the cost of a Node dependency inside an otherwise pure-Python `cron`
container. Not pursued now — FR-WX-015 is not in the current scope.

Also worth checking: **PANaHON** (`panahon.gov.ph`), DOST-PAGASA's newer hydromet observation network portal, may expose data more cleanly than the legacy FFWS pages. Not investigated — the FFWS JSON endpoint above already resolves T-OI-1 — but worth a look if FFWS ever changes shape.

### PSGC — addresses (BR-1.3)

Use the library the team already has. This is static reference data — load it once at migration time into a lookup table rather than calling anything at runtime.

---

## 8. Scheduled Jobs

A dedicated **cron container** in the Compose stack, running a small Python script against the API or the database directly.

| Tool            | Purpose                                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **APScheduler** | Job scheduling inside the cron container | Interval and cron triggers, `coalesce` and `max_instances=1` so a missed run is skipped rather than replayed in a burst. **The objection below is to APScheduler _inside the API_, not to APScheduler itself** — this container runs exactly one replica, so the duplicate-execution problem cannot arise. The alternative, a `while True: sleep()` loop, means hand-rolling misfire handling and cron expressions |

| Job                         | Frequency        | Purpose                                       |
| --------------------------- | ---------------- | --------------------------------------------- |
| Fetch Open-Meteo forecast   | 15–30 min        | BR-3.1                                        |
| Scrape PAGASA river level   | 10–15 min        | BR-3.2                                        |
| Evaluate alert thresholds   | After each fetch | BR-3.4 — prompts BDRRMC, never auto-publishes |
| Flag stale registry records | Daily            | R-2                                           |
| Send activity reminders     | Daily            | BR-8.3                                        |

> **APScheduler inside FastAPI is the tempting shortcut.** It breaks the moment you run more than one worker, because every worker runs every job. A separate container avoids that entirely and costs nothing.

> **BR-3.4 says _prompt_, not _publish_.** A scheduled job must never issue a public alert on its own. It notifies the BDRRMC, a human decides. Automated warnings from a student prototype to 143,000 residents is not a risk worth taking.

---

## 9. Infrastructure

### Containers

**Docker + Docker Compose**, one stack that runs identically on a laptop and on the VPS — which is what makes "local only" and "single VPS" the same decision rather than two.

| Service | Contents                   |
| ------- | -------------------------- |
| `web`   | Next.js                    |
| `api`   | FastAPI + Uvicorn/Gunicorn |
| `db`    | PostgreSQL + PostGIS       |
| `cron`  | Scheduled jobs             |
| `proxy` | Caddy                      |

### Reverse proxy — Caddy (still), configured for HTTP

A reverse proxy is needed regardless: one entry point routing `/` to Next.js and `/api` to FastAPI. **Caddy stays the recommendation even without HTTPS** — its config for plain HTTP is about five lines against nginx's thirty, and switching it on later is a one-line change.

```
:80 {
    handle /api/* {
        reverse_proxy api:8000
    }
    handle {
        reverse_proxy web:3000
    }
}
```

### Secure context — what plain HTTP costs

Browsers hard-block a few APIs on non-secure origins. This is not configurable — no header or permission prompt turns it off for visitors. On `http://<public-ip>`:

| API                     | Behaviour                                                    | Affects                      |
| ----------------------- | ------------------------------------------------------------ | ---------------------------- |
| `navigator.geolocation` | Error callback fires immediately; the user is never prompted | "Use my location"            |
| `getUserMedia`          | Throws. **Gallery file upload is unaffected**                | Direct camera capture        |
| `Secure` cookies        | Never transmitted                                            | Set the flag from an env var |

`localhost` is explicitly exempt.

Nothing in the BRD depends on these — they are conveniences over manual equivalents. The design rule below keeps it that way.

### Design rule: build for HTTP, enhance on HTTPS

**Plain HTTP is the baseline the app must work on.** HTTPS is an optional upgrade that unlocks two conveniences — nothing depends on it.

This is progressive enhancement, and it is the right design regardless of hosting. A large share of residents will decline the location permission prompt even where it works, so a manual path is required either way.

| Feature                         | Baseline — always available                                                             | Enhancement when secure context is present                       |
| ------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Household location** (BR-1.7) | Address fields + a **draggable pin on the map**. The user places their house themselves | A "use my location" button that pre-positions the pin            |
| **Incident photo** (BR-5.6)     | **File upload** from the phone's gallery                                                | Direct camera capture                                            |
| **Incident location** (BR-5.6)  | Draggable pin, same as above                                                            | Auto-fill from GPS                                               |
| **Refresh cookie** (Section 5)  | `httpOnly` + `SameSite`, `Secure` omitted                                               | `Secure` added — set from an environment variable, not hardcoded |

> **No BRD amendment is needed.** BR-1.7 says a household "can be geotagged to a location on the barangay map" — a draggable pin satisfies that completely. GPS was only ever one way to place it.

Detect support at runtime rather than assuming: check `window.isSecureContext` and hide the enhancement buttons when it is false, so nobody taps something that cannot work.

### Optional — turning HTTPS on

If you want the enhancements on the public URL, any of these work. **None is required.**

| Option                             | Effort                 | Notes                                                                                                                                                                                               |
| ---------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`sslip.io` + Caddy** _(easiest)_ | ~10 min, **no signup** | `203-0-113-5.sslip.io` resolves to `203.0.113.5` automatically. Put that hostname in the Caddyfile in place of `:80` and Caddy fetches a Let's Encrypt certificate itself. No account, no DNS panel |
| **DuckDNS + Caddy**                | ~20 min                | Free account and a chosen subdomain. Worth having as a fallback if sslip.io hits certificate rate limits                                                                                            |
| **Cloudflare Tunnel**              | ~20 min                | `cloudflared` as one more container; no inbound ports needed at all                                                                                                                                 |
| **Nothing**                        | —                      | Baseline behaviour above. Fully functional                                                                                                                                                          |

**Note also that `localhost` is a secure context.** If the live demo runs from a laptop — one of your chosen deployment targets — the enhancements are available during the pitch with no setup whatsoever, regardless of how the VPS is configured.

### VPS sizing

2 vCPU / 4 GB RAM is comfortable (~$10–12/mo); 1 vCPU / 2 GB works if the budget is tight. Hetzner, DigitalOcean, or a local Philippine provider — the last of these gives better latency for barangay users and may matter more than price.

### Supporting tools

| Tool                              | Purpose                                                                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **GitHub** + **GitHub Actions**   | Version control; CI running lint and tests on PRs                                                                                   |
| **`.env` files + `.env.example`** | Configuration. **Never commit real secrets** — a committed database password in a public student repo is a genuinely common failure |
| **Backups**                       | `pg_dump` on a cron schedule to a second location. A VPS with no backup is one failed disk away from losing the whole demo          |

---

## 10. What We Deliberately Did Not Choose

Recording these so they are not revisited without a reason.

| Not chosen                           | Why                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Kubernetes                           | One barangay, one VPS. Compose is correct                                                                               |
| Microservices                        | A team of five shipping in weeks needs one API, not service boundaries                                                  |
| MongoDB                              | The data is relational and spatial. Postgres + PostGIS wins on both counts                                              |
| GraphQL                              | REST plus TanStack Query covers every screen here                                                                       |
| Mapbox / Google Maps                 | Both require API keys and billing. OSM is free and adequate                                                             |
| MapLibre GL                          | Would work, and handles PMTiles natively — but the clipped-GeoJSON approach (Section 6) removes the reason to prefer it |
| Managed auth (Supabase, Auth0)       | Team chose custom JWT. Listed here as the fallback if Section 5 becomes a time sink                                     |
| Server-side rendering for the portal | Only the public site benefits from SSR/ISR. The logged-in portal is an app; client-side rendering is simpler            |
| Native mobile                        | Out of scope per BRD 4.2. A responsive web app is the deliverable                                                       |

---

## 11. Risks Carried by These Choices

| #   | Risk                                                                                                                                                                                          | Mitigation                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| T-1 | **PAGASA scraper breaks or is unavailable** during the event it exists for                                                                                                                    | Manual override built first (Section 7); seeded data for the demo; last-known-good with visible staleness                    |
| T-2 | **Custom auth is implemented insecurely**                                                                                                                                                     | argon2, httpOnly cookies, server-side authorization, rate limiting (Section 5). Swap to managed auth if time pressure mounts |
| T-3 | **Single VPS is a single point of failure**                                                                                                                                                   | Automated `pg_dump` backups off-box; a local Compose stack can run the demo if the VPS dies on the day                       |
| T-4 | **PostGIS learning curve** — nobody on the team may have used it                                                                                                                              | Only three or four spatial queries are actually needed. Learn those, not the whole surface                                   |
| T-5 | **Three.js is a time sink.** 3D work expands to fill available time                                                                                                                           | Time-box it. A simple extruded-polygon map coloured by risk level delivers the point; photorealism does not add marks        |
| T-6 | **OSM tile policy** breached if traffic grows                                                                                                                                                 | Attribution in place from day one; switch to Carto or Stadia free tier if needed (one-line change)                           |
| T-7 | **Free-tier and open data sources change terms**                                                                                                                                              | Open-Meteo and NOAH data are both cached or vendored locally, so a change upstream does not break a running demo             |
| T-8 | **Geolocation and camera are unavailable over plain HTTP**                                                                                                                                    | **Low** — by design                                                                                                          | Manual paths are the baseline, not the fallback: draggable map pin and gallery upload (Section 9). GPS and camera are optional enhancements. HTTPS via sslip.io is available if wanted, not required |
| T-9 | **Enhancement-only code paths go untested.** They work on `localhost` and are invisible on the deployed HTTP URL, so a bug in the manual path can hide behind the GPS path during development | Medium                                                                                                                       | Develop against the manual path as the default. Test the deployed URL from a phone before the pitch                                                                                                  |

---

## 12. Open Technical Decisions

| #          | Item                                                                                                                                                                                                                               | Owner                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| ~~T-OI-1~~ | _Resolved (Section 7)_ — the legacy FFWS endpoint returns JSON directly; no scraper or PANaHON evaluation needed                                                                                                                   | —                        |
| T-OI-2     | Obtain the **San Jose boundary polygon** needed to clip the hazard data. Fastest route is OpenStreetMap via Overpass (`admin_level=10`); alternatives are PSA shapefiles or the barangay itself. A bounding box works as a stopgap | IT lead + PubAd lead     |
| T-OI-7     | _Resolved_ — using BetterGov / NOAH province shapefiles under ODC-ODbL after LiPAD downloads corrupted. Attribution required in the map footer and About section                                                                   | IT lead                  |
| T-OI-3     | Confirm the **area/zone boundaries** (BRD OI-3) — the 3D map cannot be built without them                                                                                                                                          | PubAd lead, via barangay |
| T-OI-4     | Decide whether email is needed for password reset, or whether admin-initiated reset is sufficient (Section 5)                                                                                                                      | IT lead                  |
| T-OI-5     | Choose a VPS provider and region — local Philippine hosting may beat cheaper EU options on latency                                                                                                                                 | IT lead                  |
| T-OI-6     | **Optional: enable HTTPS via sslip.io (Section 9).** Not required — the app works on plain HTTP by design. Ten minutes if the team wants GPS and camera on the public URL                                                          | IT lead                  |

---

## Appendix — Sources

- [Project NOAH Hazard Maps — BetterGov.ph open data (HuggingFace mirror)](https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps)
- [Project NOAH Hazard Maps — BetterGov.ph Open Data Portal](https://data.bettergov.ph/datasets/22)
- [UP NOAH Center — Know Your Hazards](https://noah.up.edu.ph/know-your-hazards)
- [LiPAD — LiDAR Portal for Archiving and Distribution](https://lipad.dream.upd.edu.ph/)
- [PAGASA — Pasig-Marikina-Tullahan FFWS Water Level Map](https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/map.do)
- [DOST-PAGASA PANaHON — Nationwide Hydromet Observation Network](https://www.panahon.gov.ph/)
- [Open-Meteo — Free Weather API](https://open-meteo.com/)
- [Open-Meteo features and licensing](https://open-meteo.com/en/features)
- [ODC Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1.0/)
- [MDN — Secure contexts, and features restricted to them](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts/features_restricted_to_secure_contexts)
- [Caddy — reverse proxy quick start](https://caddyserver.com/docs/quick-starts/reverse-proxy)
