# Structure & rendering

## Route groups

Four, and the parentheses mean they do not appear in the URL — they exist to give each surface
its own layout and its own guard.

| Group      | Surface                                           | Guard                                     |
| ---------- | ------------------------------------------------- | ----------------------------------------- |
| `(public)` | Landing, guides, hazard map, donate, hotlines     | None                                      |
| `(auth)`   | Login, register, password reset                   | None — but redirects if already signed in |
| `(portal)` | Resident's own household, safety check-in, go-bag | Signed in                                 |
| `(admin)`  | Barangay console                                  | Signed in **and** role-checked            |

> The guards here are **convenience, not security**. Every one of them is re-checked
> server-side by the API (FR-SYS-006). A guard that only exists in the browser is a guard an
> attacker skips by calling the endpoint directly.

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
