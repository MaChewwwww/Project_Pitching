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

## The API client

One configured axios instance, `src/lib/api/client.ts`. Nothing calls `fetch` or bare `axios`.

```ts
import { api } from "@/lib/api/client";
```

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

## The public seam, and how to close it

The public site does not use the axios client yet. It reads through
`src/lib/api/public.ts` — one async getter per future endpoint, each currently returning a
typed fixture and each marked:

```ts
/** TODO(FR-PUB-013): `GET /public/announcements` */
```

`grep -rn "TODO(FR-PUB-013)" src` is therefore the complete integration checklist. Closing
FR-PUB-013 means replacing those bodies with `api.get(...)` and nothing else: the getters are
already `async`, already return `Page<T>` envelopes, and already return the exact DTOs in
`src/lib/api/public-types.ts`.

Three rules keep that swap honest:

- **Pages and sections never import a fixture.** They call the seam. The one exception is the
  error and not-found boundaries, which import `HOTLINES` directly — a fallback that depends on
  the fetch which may have just failed is not a fallback.
- **Fixtures are typed only by the DTOs.** `const x: PublicHotline[] = [...]` means `tsc` fails
  the moment a fixture drifts from the contract.
- **Field names are `schema.md` column names, verbatim.** Derived fields — `occupancy`,
  `is_stale`, `coverage_pct`, `issued_by_name` — are marked as derived in `public-types.ts` so
  nobody goes looking for a column that does not exist.

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
