# Structure & rendering

## Route groups

Four, and the parentheses mean they do not appear in the URL — they exist to give each surface
its own layout and its own guard.

| Group      | Surface                                                                                                                                                   | Guard                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `(public)` | Landing (`/`), announcements, weather & river level, evacuation centres, hazard map, preparedness guides, activities, donation drives, help & FAQs, about | None                                      |
| `(auth)`   | Login, register, password reset                                                                                                                           | None — but redirects if already signed in |
| `(portal)` | Resident's own household, safety check-in, go-bag                                                                                                         | Signed in                                 |
| `(admin)`  | Barangay console                                                                                                                                          | Signed in **and** role-checked            |

> The guards here are **convenience, not security**. Every one of them is re-checked
> server-side by the API (FR-SYS-006). A guard that only exists in the browser is a guard an
> attacker skips by calling the endpoint directly.

The root layout uses CSS font stacks rather than `next/font/google`. This keeps production image
builds independent of external font hosts; the branded families are preferred when installed and
system fallbacks preserve the hierarchy otherwise.

## Announcement routes and the shared editor

The announcement CMS is the reference route composition for future portal authoring work:

| Route                                      | Responsibility                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `/admin/announcements`                     | Resource list with search, filters, pagination, and row actions                               |
| `/admin/announcements/create-announcement` | Supplies create defaults and mutation handlers to `AnnouncementForm`                          |
| `/admin/announcements/[id]`                | Loads an existing record and supplies edit defaults plus the persistent `ArticleImageManager` |

Create and edit intentionally render the same form surface. Keep route pages thin: they own data
loading, API mutations, and navigation, while shared composites own field layout, validation,
responsive behaviour, preview, and media controls. Public `/announcements` and
`/announcements/[slug]` remain read-only; admin deletion is a soft deactivation and deactivated
records are excluded from public reads.

The admin route set intentionally has no `/admin/areas` or `/admin/config` page. Those values are
reference/service data consumed by operational screens, not standalone console workflows.

## Weather & Flood Watch workspace

`/admin/readings` is the single console entry point for weather operations. Its tabs are `Overview`,
`Threshold Review`, and (admins only) `Manual Entry`; the selected tab is retained in the `tab` query
parameter. `/admin/alert-prompts` is not a route or sidebar destination. Threshold prompts remain in
the review queue after acknowledgement; only unacknowledged prompts can be deleted as false positives.
`/admin/flood-events` remains separate because flood history is an editorial record with its own
create/edit lifecycle.

The workspace deliberately reuses the public `WeatherPanel`, `RiverLevelPanel`, `DataFreshness`, and
`AlertLevelIndicator` components so staff and residents read the same cached measurements. API access
still enforces the role boundary: BHW may record readings, while only admin/superadmin can review prompts,
acknowledge or delete unacknowledged prompts, or run the typhoon demo sequence.
The weather panel shows the latest current reading for each metric. It also shows today's highest
observed rainfall and heat-index readings from the Asia/Manila calendar day; a peak stays blank until
that day has a matching observation. Its forecast strip keeps the announcement-style select control
for the hourly/daily horizon and uses Rain Chance and Heat Index tabs. Hourly includes the current
hour; Daily includes today and shows that day's maximum apparent temperature as the heat-index proxy.
The rain bars scale to expected rainfall rather than probability so a 100% chance does not flatten
the chart; probability, millimetres, severity, and the metric-specific guidance remain available
through the keyboard-reachable tooltip. Tooltips use the same rain/heat accent and severity icon as
their source control. The current Rainfall and Heat Index cards use the same severity icon and
explanation pattern. Heat bars are scaled from the 27°C Caution boundary rather than zero so the
narrow but important day-to-day range remains visible. The river gauge keeps its human-issued alert
level separate from the forecast, but adds a clearly labelled cached rainfall outlook when hourly
rain is expected. Light rain is explicitly described as insufficient on its own to materially raise
the river; only moderate or heavy rain carries a rising-water advisory. The forecast never changes
the gauge's alert state.

## Rendering strategy, per surface

Chosen per surface rather than globally (`architecture.md` A-12):

| Surface                | Strategy                           | Why                                                                           |
| ---------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| Public landing         | **ISR**, ~60s revalidate           | Fast on a cheap phone over a congested connection; the content changes slowly |
| Public hazard map      | Static shell + client-side GeoJSON | Leaflet touches `window` at import — it cannot render on the server           |
| Emergency alert banner | **Client-side, short poll**        | Must reflect reality in seconds, not at the next revalidation                 |
| Resident portal        | Client-side                        | Per-user data, no SEO value                                                   |
| Admin console          | Client-side                        | An application, not a document                                                |

**Only the public site benefits from server rendering.** Making the portal SSR would add
auth-on-the-server complexity for zero user-visible gain.

## Client-only components

Three need `dynamic(..., { ssr: false })`, for different reasons:

| Component                       | Reason                                                                |
| ------------------------------- | --------------------------------------------------------------------- |
| `HazardMap` (Leaflet)           | Touches `window` at import time                                       |
| `ZoneMap3D` (React Three Fiber) | Same, **plus** gated on viewport ≥ `md` and `hardwareConcurrency > 4` |
| Recharts                        | Heavy. It must never reach the landing bundle (NFR-PERF-007)          |

The 3D map's gate is a product decision, not an optimisation. On a low-end Android it stutters
and drains battery, so below `md` it renders a static image or the 2D map, with an explicit
"View 3D map" opt-in (`design.md` Section 9.6).

## Section-level error isolation

FR-PUB-016 and BR-0.17 require that a failed weather feed degrade **that section only**. A
route-level `error.tsx` cannot deliver it — it replaces the whole page body, which is the
failure being described. So the mechanism is `common/SectionBoundary`, built as a React class `ErrorBoundary` (avoiding Turbopack CJS/ESM interop issues), wrapping each section individually.

Two things about it are worth knowing before touching a public page:

**The boundary is a Client Component; the section inside it is not.** `SectionBoundary`
receives server-rendered `children` as a prop, so wrapping thirteen sections costs one small
client component in total rather than thirteen client subtrees.

**Each section must fetch its own data.** This is the part that is easy to get backwards.
Fetching everything at the top of `page.tsx` in one `Promise.all` and passing it down reads
better and keeps the data flow visible in one file — and it silently breaks the requirement,
because every `await` then sits _above_ every boundary. One rejected promise takes the page
down before a boundary exists to catch it. Verified by fault injection: with the fetch hoisted,
a throwing getter blanked all thirteen sections; with the fetch inside the section, it cost one
card and everything else rendered.

There are four layers in total, and only the first is the primary mechanism:

| Layer                    | Scope                          | Purpose                                                      |
| ------------------------ | ------------------------------ | ------------------------------------------------------------ |
| `SectionBoundary`        | one section                    | The FR-PUB-016 mechanism                                     |
| `(public)/error.tsx`     | page body                      | Last resort. Renders hotlines inline                         |
| `(public)/not-found.tsx` | unknown slug from `notFound()` | Keeps the shell                                              |
| `app/not-found.tsx`      | unmatched URL                  | Mounts `PublicShell` itself — routing never enters the group |
| `app/global-error.tsx`   | root layout crash              | Self-contained, zero imports, inline styles                  |

`global-error.tsx` is the one file in this app allowed to contain literal hex and hardcoded
phone numbers: it replaces `<html>`, so `globals.css` never loads and no import is guaranteed
to resolve. NFR-AVL-004 outranks tidiness there.

## Section-level loading isolation

The same argument as above, applied to latency instead of failure. Every async section sits in
its own `<Suspense>` with a `Section*Skeleton` fallback from `common/skeletons.tsx`, so a slow
fetch delays one section rather than the first byte of the whole body.

**`SectionBoundary` goes outside `Suspense`, not inside.** Inverting them lets an error thrown
after streaming has begun escape past the section boundary to the route-level `error.tsx`,
which replaces the entire page body — the exact failure FR-PUB-016 forbids. The nesting is
load-bearing, not stylistic.

**Without a Suspense boundary there is no loading state to design.** A Server Component that
awaits simply delays its own output; nothing renders in the meantime. This is why Definition of
Done item 3 sat open for the public sections even though the fallbacks existed — the fallbacks
had nowhere to mount.

Two consequences worth knowing:

- **Fallbacks must reproduce their section's real grid.** They duplicate `Section`'s tone and
  padding rather than importing it, because `common/` may not import from `features/`. If a
  section's layout changes, its fallback has to change with it or the page shifts on stream-in.
- **Sections that return `null` when empty (FR-PUB-018) still show a fallback first**, then
  collapse to nothing once the fetch resolves empty. Briefly reserving that space is the price
  of not blocking the rest of the page on it.

`AboutBandSection` is synchronous, so it gets a boundary but no `Suspense` — there is nothing
to wait for.

## Verifying in a headless or hidden browser pane

A browser pane that is not displayed does not composite frames, and three things stop working
in a way that looks exactly like a bug in this app. All three cost an hour to chase; none was
real.

| Symptom                                                                                                                                      | Actual cause                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| The 3D canvas is stuck at 300×150 while every container around it measures correctly                                                         | R3F sizes the drawing buffer from a `ResizeObserver`, which never fires                                                                          |
| Focus rings appear to be missing — `:focus-visible` matches, `--tw-ring-shadow` holds the right value, but `box-shadow` is fully transparent | The button base has `transition-all`, and transitions never advance without a frame loop, so the animated value stays at its initial `0 0 #0000` |
| Screenshots time out                                                                                                                         | Same root cause                                                                                                                                  |

Before concluding any of these is a defect, check whether the environment is animating at all:

```js
new ResizeObserver(() => console.log("RO fired")).observe(document.body);
requestAnimationFrame(() => console.log("rAF fired"));
```

If neither logs, the measurement is an artifact. For the focus ring specifically, setting
`el.style.transition = "none"` and re-reading `getComputedStyle(el).boxShadow` synchronously
reveals the real value.

## Timestamps and hydration

`formatDistanceToNowStrict`-style relative time computes from the current clock, so the server
and client disagree by however long the request took — React reports that as a hydration
mismatch, and under ISR the server's copy can be a full revalidation window stale.

`hooks/use-relative-time.ts` returns the absolute Philippine time during SSR and the first
client render, then swaps to relative inside an effect. `DataFreshness` is a Client Component
for that reason alone.

Every formatter in `lib/format.ts` pins `timeZone: "Asia/Manila"` explicitly. An unpinned
`Intl.DateTimeFormat` uses the runtime's zone, which differs between the container and the
reader's phone — the same hydration bug wearing a different hat.

Do not reach for `suppressHydrationWarning`. It silences the class of bug rather than fixing
the instance.

## The 3D hero's three tiers

The landing hero renders one of three things, and the choice is a product decision rather than
an optimisation (`design.md` Section 9.6, FR-MAP-012):

| Tier           | Condition                               | Renders                                          |
| -------------- | --------------------------------------- | ------------------------------------------------ |
| 3D             | ≥`md` **and** `hardwareConcurrency > 4` | React Three Fiber scene                          |
| 2D             | anything below that                     | inline SVG isometric, plus a "View in 3D" opt-in |
| SSR / Suspense | always first paint                      | the same SVG                                     |

`three` is reached only through `dynamic(..., { ssr: false })`, so it lands in its own chunk and
never enters the landing bundle (NFR-PERF-007). The SVG is server-rendered, which means it costs
about 3 KB in the document and **zero** against the client-JS budget — cheaper than `next/image`
with an AVIF, and it needs no binary asset.

The scene reads its colours from the CSS custom properties at runtime. WebGL materials cannot
take a Tailwind class, and hardcoding the hazard ramp would put a second copy of the palette
outside `globals.css`.

## Things that are easy to get wrong

- **`(public)` pages must not render personal data.** Only area-level aggregates (FR-PUB-014).
  The API enforces this by giving public endpoints their own serializers — do not defeat it by
  fetching from an admin endpoint on a public page.
- **A failed section degrades that section only** (FR-PUB-016). A dead weather feed must not
  blank the landing page, and hotlines must render no matter what else fails. Error boundaries
  go around sections, not around the page.
- **Empty sections are not rendered as empty shells** (FR-PUB-018). No content, no section.
- **The emergency alert banner is not dismissible while active** (FR-PUB-017), sits above
  everything including the navbar, and announces via `aria-live="assertive"` — a resident using
  a screen reader needs to hear an evacuation order without hunting for it.

## Metadata and fonts

Both live in `src/app/layout.tsx`. The three font families load through `next/font/google` with
`display: "swap"` and the latin subset only.

The viewport deliberately sets **no** `maximum-scale` and does not disable user scaling — the
page has to stay usable at 200% zoom (`design.md` Section 10).

`APP_NAME` comes from `src/lib/brand.ts`. It is a placeholder (BRD OI-1); defining it in one
constant means the rename is one line. Never hardcode it.
