# Components

Three layers, and the boundaries between them are the whole point.

```
components/
├── ui/         shadcn primitives — installed by `make shadcn`, never edited
├── common/     the app's own composites, built FROM ui/. Pages import these
└── features/   domain components, mirroring apps/api/src/modules/
```

The inventory — every composite, what it does, what it must handle — is
[`design.md`](../../../docs/design.md) Section 7.2. This file is about the mechanics.

## Why pages never import `ui/` directly

A raw shadcn primitive is not this app's component. `design.md` assigns heights (32/40/48),
radii, and variants (`emergency`, `danger`) that shadcn's defaults do not have. If pages import
primitives, those specs get reapplied by hand on every page and drift immediately.

Worse: `make shadcn` **overwrites `ui/`**. Any styling put there is lost on the next reinstall,
silently, and probably during a rebase nobody is reading closely.

So: `ui/` is vendored source. `common/` is where this app's decisions live.

## How a composite overrides a primitive without editing it

`ui/button.tsx` ends with `cn(buttonVariants({ variant, size, className }))`. cva appends
`className` **last** in the string, and `cn` is `twMerge` — so a class passed in from
`common/Button` wins the conflict against the primitive's own variant and size classes.

That single detail is what makes the whole two-layer rule practical. We never restyle the
vendored file; we out-specify it. `common/Button` still passes a `variant` down (mapping
`danger` and `emergency` onto `destructive`) so the primitive's focus-ring and
`aria-expanded` handling comes along, then replaces every dimension and colour.

`size` is always passed as `"default"`. Letting the primitive's size classes through would
mean two sources of truth for button height, and `twMerge` would arbitrate by class order
rather than by intent.

## Traps in the primitives

- **`ui/card` sets `overflow-hidden`.** Anything meant to overlap a card's edge — the offset
  badge in the reference layout's alternating split — must be an absolutely-positioned
  **sibling** inside a `relative` wrapper, never a child. It will be silently clipped
  otherwise.
- **`ui/separator` and `ui/progress` carry `"use client"`.** For a decorative divider use a
  bordered `div`; for a progress bar use `common/MeterBar`. Both exist to keep client
  boundaries off the landing page, which has the only hard bundle budget in the project
  (NFR-PERF-006). `ui/progress` is fine in the admin console.
- **`ui/card` drives its padding through `--card-spacing`**, so overriding that one variable
  moves the header, content and footer together. Setting `p-*` on the card fights it.

## The two mismatches you will notice first

`make shadcn` gives you components whose defaults do not match `design.md`:

|               | shadcn default      | `design.md`                                                 |
| ------------- | ------------------- | ----------------------------------------------------------- |
| Button height | 32–36px             | 32 / **40** / 48 (Section 7.3)                              |
| Button radius | `rounded-lg` → 14px | `md` → 10px on the admin console, `full` on the public site |
| Card radius   | `rounded-xl` → 20px | `lg` → 14px                                                 |

**The tokens are right; the primitives just pick different steps.** `--radius-md` _is_ 10px and
`--radius-lg` _is_ 14px, exactly as Section 5 specifies. The fix is `common/Button` and
`common/Card` applying the right token — not editing `ui/button.tsx`.

Until those composites exist, anything built on raw primitives looks subtly off-spec. That is
one reason `design.md` Section 12 puts them at stage 1.

## Token wiring

All of it is in `src/app/globals.css`, and that is the only file that should contain a colour.

- `@theme inline` exposes tokens as Tailwind utilities — `bg-primary-600`, `text-alert-2`,
  `bg-hazard-high`, `bg-surface-dark`.
- `:root` holds the shadcn semantic variables (`--primary`, `--border`, …).
- Type scale classes — `text-display-xl`, `text-h1`, `text-overline` — are component classes
  with the `md` breakpoint built in, so `text-h1` is 24px on a phone and 30px on a desktop
  without a responsive prefix at the call site.

Two things worth knowing:

- **Values are hex, not the HSL from `design.md` Section 3.6.** Those triplets are rounded and
  do not resolve to the hex they name — `hsl(149 61% 31%)` is `#1F7F4D`, not `#1F8049`. Side by
  side, `bg-primary` and `bg-primary-600` were visibly different greens. The hex in Sections
  3.1–3.3 is authoritative; the HSL is kept in a comment on each line.
- **No dark mode.** Deliberate (Section 3.6) — barangay staff work in a daylight office,
  residents are outdoors. The `@theme inline` indirection means adding a `.dark` block later is
  the only change needed.

## Domain palettes are not decorative

Each maps to a defined concept, and the mapping must stay consistent everywhere:

- **Flood hazard** is `#FFED4A` / `#F59E0B` / `#EF4444` — the official Philippine convention
  used by UP NOAH, LiPAD, MGB, and PHIVOLCS. Not blue. Residents have seen this ramp on every
  hazard map the government has published; re-teaching them a private scheme costs more than it
  buys.
- **Hazard is always a translucent map polygon. Alert level is always a solid badge** with a
  number and a word. They share warm hues, which is fine _because they never appear in the same
  visual form_. Keep that absolute — never render an alert level as a map fill.

## Responsive is not a later pass

Retrofitting a mobile variant onto `DataTable` after ten screens depend on it is the single most
expensive rework available on this project (`design.md` Section 12).

`DataTable` ships three mobile modes — `cards`, `priority`, `scroll` — chosen per table, not
globally. On touch, row actions become a bottom sheet, never a hover dropdown: there is no hover
on a phone, and a 32px icon in a row is not a reliable tap target.

Tap targets: **44×44 minimum, 48×48 for anything used during an emergency** — safety check-in,
rescue request, hotline. Where the visual button is smaller, pad the hit area rather than
enlarging the button.

## Console DataTable and article CMS

`features/admin/resource-table.tsx` is the shared console list surface. It owns search,
categorical filtering, sortable headings, pagination, empty/loading/error states, and the
stacked-card small-screen layout. A resource page supplies its columns and actions; it must not
recreate those controls in a page.

Article creation starts on its own route rather than inside a scrolling dialog. The first save
creates a draft, then the full editor pairs the form with `ArticleImageManager`. This keeps media
validation visible without weakening the server-side publication rule.

## Animation lives in `globals.css`, not in a client component

`WaterSpinner` and the hero illustrations are animated entirely by CSS classes defined in
`globals.css` (`.ws-*`, `.hero-*`) over static markup. None of them carry `"use client"`.

That is a hard constraint, not a preference. A spinner is needed inside `<Suspense fallback>` on
the landing page, and anything with `"use client"` there would pull a JavaScript boundary into
every section it guards — precisely the cost `SectionBoundary` is designed to keep to one
component per page (NFR-PERF-006). Reach for a client component only when the animation
genuinely needs state or measurement, as `StatBandAnimator` does.

**Infinite ambient loops need their own `prefers-reduced-motion` guard.** The global kill-switch
in `@layer base` sets `animation-duration: 0.01ms`, which is right for an entrance animation that
ends in a visible state — but a loop whose keyframes start and end at `opacity: 0` gets frozen
invisible by it. So `.ws-*` is gated on `prefers-reduced-motion: no-preference`, and the ungated
rules are authored to stand alone as a legible static resting state. Test any new loop with
reduced motion enabled before calling it done.

**3D depth comes from `perspective` + `transform-style: preserve-3d` on inline elements**, not a
canvas or a WebGL dependency. `WaterSpinner` tilts a ripple plane with `rotateX` and precesses
two rings by spinning wrappers about Y while the ring inside holds a fixed tilt — so the tilt
axis rotates rather than the ring spinning flat. Keep transforms that must compose on separate
nested elements; stacking a squash and a rotation on one node makes both fight.

## Adding a composite

1. Build it in `common/` from `ui/` primitives.
2. Make it work at 360px **first**, then widen.
3. Handle loading, empty, and error states — not just the happy path (Definition of Done item 3).
4. Keyboard reachable, visible focus ring, contrast at WCAG AA.
5. Never colour alone — every status carries an icon or a text label as well. Alert levels
   always show the number.
6. If it is a new entry in the inventory, add it to `design.md` Section 7.2 in the same PR.

## `lucide-react` icon assignments

`design.md` Section 6 fixes an icon per concept — `Users` for household, `Waves` for river
level, `LifeBuoy` for rescue. Keep them stable. Users learn icons faster than labels, and
re-teaching them costs more than a better-looking icon is worth.
