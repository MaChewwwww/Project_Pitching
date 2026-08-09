# Data & state

## Who owns what

| Kind of state                                      | Owner                                                  |
| -------------------------------------------------- | ------------------------------------------------------ |
| Server data                                        | **TanStack Query** — the default for almost everything |
| Forms                                              | React Hook Form + Zod                                  |
| Auth session                                       | React Context; access token in memory                  |
| Ephemeral UI                                       | Local `useState`                                       |
| Cross-cutting UI (active alert, map layer toggles) | Zustand — deliberately small                           |

**No global store of server data.** Query owns the cache; copying it into Zustand is how
staleness bugs get created (`architecture.md` Section 10.3). If you are about to put API data in
a store, you probably want a query key instead.

There are exactly two Zustand stores, and both hold booleans and enums only:
`lib/i18n/language-store.ts` (which language column renders) and `lib/map-layer-store.ts`
(which map layers are visible, which indicator shades the areas). The map's GeoJSON,
facility list, and area stats are server data and stay in Query or props.

## Map modules

Four files, and the split matters because Leaflet is unusually easy to get wrong twice.

| File                     | Holds                                                                        |
| ------------------------ | ---------------------------------------------------------------------------- |
| `lib/map.ts`             | Viewport, bounds, tile URL, **every map colour**, layer keys                 |
| `lib/leaflet-setup.ts`   | The default-icon fixup. Import for the side effect, once per marker consumer |
| `lib/map-layer-store.ts` | Layer visibility + area shading (Zustand)                                    |
| `lib/hazard-geojson.ts`  | Loads the staged GeoJSON, degrades on 404                                    |

Three rules that each cost real time to learn:

- **Never read a colour from the GeoJSON.** The committed hazard data carries `fill_color`
  (`tools/prepare_hazard.py` writes it), so it is tempting. Doing so puts the palette in the
  data file _and_ `globals.css`, and a wrong colour becomes unattributable. `lib/map.ts` wins;
  the values there are the tokens from `design.md` Section 3.4.
- **`BARANGAY_CENTER` in `lib/brand.ts` is `{ lat, lon }`. Leaflet wants `lng`.** Use
  `BARANGAY_VIEW` from `lib/map.ts`, which does the conversion once, rather than converting
  again at each call site.
- **A missing hazard layer is not an error.** `public/data/*.geojson` is gitignored, so any
  fresh environment 404s until `make hazard-web` runs. `useHazardGeoJson` returns
  `status: "unavailable"` and the map renders without the flood polygons. Never throw — the
  client boundary would take the whole page down, which is exactly what the server-side
  fallbacks in `lib/api/public.ts` exist to prevent.

Every Leaflet component is `dynamic(..., { ssr: false })` — `react-leaflet` touches `window` at
module load. And after editing anything under `public/` or a module-scope side effect like
`leaflet-setup.ts`, **restart the `web` container**: Turbopack on Windows bind mounts misses both.

## The API client

One configured axios instance, `src/lib/api/client.ts`, used by client components and the
admin console.

```ts
import { api } from "@/lib/api/client";
```

### The one exception: `lib/api/server.ts`

The public site's Server Components use `fetch` directly, via `serverGet()` in
`src/lib/api/server.ts`, not axios. This is deliberate, not an oversight: axios in a Server
Component bypasses Next's own data cache, and ISR (`~60s` revalidate, `architecture.md` Section
10.1) **is** that cache — there is nothing for `next: { revalidate }` to attach to on an axios
call. `fetch` is the correct tool for exactly this one job, and it is the only place in the
codebase that uses it directly.

`serverGet(path, zodSchema, { revalidate, searchParams })` talks to `API_INTERNAL_BASE_URL`
(container-to-container, no proxy hop — see `.env.example`), Zod-parses the response, and throws
`ApiFetchError` on any failure. Every getter in `lib/api/public.ts` catches that and returns an
empty-shaped fallback — see "Section-level failure isolation" below.

- `withCredentials: true` so the httpOnly refresh cookie survives the round trip.
- A request interceptor attaches the in-memory access token.
- `toDisplayError()` turns any failure — including a network error with no response — into the
  RFC 7807 shape, so a component never renders `[object Object]` and never has to distinguish
  "server said no" from "phone lost signal".

### The access token lives in a module variable

Not `localStorage`, not `sessionStorage`, not a readable cookie. An XSS payload can read all
three; it cannot read a closure. The refresh token is httpOnly, so JavaScript cannot reach it at
all (`architecture.md` A-5).

This means the token is gone on reload — which is intended. The refresh cookie is what restores
the session.

## The public seam — closed (FR-PUB-013)

The public site reads through `src/lib/api/public.ts` — one async getter per endpoint, each a
single `serverGet(...)` call, Zod-parsed against `src/lib/api/public-schemas.ts`. The seam is
what made this a one-file change: every page and section already called these getters and typed
its output against `src/lib/api/public-types.ts`, so wiring the real API changed no call site.

Two rules keep it honest going forward:

- **Pages and sections never import a fixture.** They call the seam. The one exception is the
  error and not-found boundaries, which import `HOTLINES` from `lib/fixtures/hotlines.ts`
  directly — a fallback that depends on the fetch which may have just failed is not a fallback.
- **Field names are `schema.md` column names, verbatim**, in both `public-types.ts` (the
  TypeScript contract) and `public-schemas.ts` (the Zod runtime check). Derived fields —
  `occupancy`, `is_stale`, `coverage_pct`, `issued_by_name` — are marked as derived so nobody
  goes looking for a column that does not exist.

### Section-level failure isolation (FR-PUB-016, NFR-AVL-002/004)

Every getter in `public.ts` catches `ApiFetchError` and returns an empty-shaped fallback —
`emptyPage()`, `null`, or a zeroed aggregate — rather than throwing into the page. A failed
weather fetch degrades the weather section only. `getHotlines()` is the deliberate exception:
on failure it falls back to the static `HOTLINES` fixture, never to an empty list, because
NFR-AVL-004 requires hotlines to render even when nothing else can.

`lib/fixtures/` is retired except `hotlines.ts` (the load-bearing fallback above) — every other
fixture file had exactly one consumer, `public.ts`, and is gone along with the fixture bodies it
returned. `lib/content/` — nav, footer, hero copy, mission/vision — was never a fixture; it is
static copy that is never served by an API, and stays exactly where it is.

Static copy — navigation, footer groups, hero wording, mission and vision — lives in
`src/lib/content/`, **not** in `fixtures/`. It is never served by an API and never will be;
mixing the two is how a fixture directory becomes permanent.

### Fixture timestamps are relative, on purpose

`fixtureNow()` is a function called during render, not a module constant. A constant is
evaluated once when the module first loads and then frozen for the life of the process, so
"14 minutes ago" becomes "3 weeks ago" the month after it was written — on a page whose entire
premise is that data freshness is visible. ISR's 60-second revalidation re-runs it.

The two genuinely historical dates (Ondoy 2009, Ulysses 2020) use `fixedDate` instead, because
there the date is part of the fact.

### Where a null is the right answer

Several figures are genuinely unknown, and the fixtures encode that rather than papering over it:

| Field                                         | Why null                                                        | Renders as                                 |
| --------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| `coverage_pct`, `configured_total_households` | The barangay's household total is unsupplied (BRD OI-12)        | "Barangay-wide total pending from the LGU" |
| `thresholds` on the river level               | The MDRRMO has not confirmed the Level 1/2/3 heights (BRD OI-4) | Unlabelled gauge segments plus a note      |
| `area.centroid`                               | No boundary geometry yet (BRD OI-3)                             | Nothing spatial is drawn                   |

Do not fill these in to make a screen look finished. FR-ANL-003 makes coverage the honest
headline metric, and Marikina's 15/16/18 m thresholds belong to a different river at a different
gauge — borrowing them would be worse than showing nothing.

## Types and the contract

`packages/api-types/src/generated.ts` is generated from the API's OpenAPI schema by `make types`
and **committed** so CI can diff it. Never hand-edit it; if CI's `types` job fails, you skipped
`make types` (`architecture.md` AR-9).

Generated types catch drift at build time. **Zod-parse responses at runtime as well** — the
types are erased at runtime, so a backend change that CI somehow missed shows up as a clear
parse error rather than as `undefined` on a dashboard.

## Query conventions

- One hook per resource, in `src/hooks/`. Components call hooks, not the client.
- `staleTime` defaults to 60s. Readings are polled by the scheduler every 15–20 minutes, so
  refetching faster than that only burns a resident's mobile data.
- `refetchOnWindowFocus` is off by default. Turn it on per-query where freshness genuinely
  matters — the emergency alert banner, the accounted-for dashboard during an event.
- Invalidate by key after a mutation. Do not hand-patch the cache unless the optimistic update
  is genuinely worth it.

## Every reading shows its age

Not a convention — a requirement (BR-3.8, FR-WX-010, FR-WX-011). Every weather and river value
carries its source and `observed_at`, and stale values are visibly marked by the
`DataFreshness` component.

**A number with no age is a lie waiting to happen.** The API never hides staleness; it returns
yesterday's number labelled as yesterday's rather than an empty panel, and the UI must render
that label.

## Forms

React Hook Form + Zod, via `@hookform/resolvers`. The registration form has many conditional
fields per member; this pairing is what keeps it manageable.

- Errors render **below the field, with an icon** — never colour alone.
- Required fields are marked `*` **and** described in the helper text.
- Set `inputMode` correctly: `numeric` for age and weight, `tel` for phone. On a phone this is
  the difference between a usable form and a hostile one.
- Single column, always. Sticky footer for the primary action.

### Draft persistence is not optional

A BHW filling a long household form in an alley **will** lose signal mid-form, and losing twenty
minutes of entered data will stop them using the platform at all (FR-REG-012).

- Persist form state to `localStorage` as they type, keyed by draft ID. Restore with a clear
  "Resume draft?" prompt.
- Queue the submit and retry rather than failing outright: "Saved locally — will upload when
  connected."
- **Never clear the form on a failed submit.** This is the single most common way field
  data-entry tools lose people's trust.

Full offline sync is _not_ in scope (`design.md` D-OI-8). Local drafts are.
