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
