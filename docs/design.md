# Design System

**Project:** `[APP_NAME]` — Barangay San Jose Disaster Readiness & Community Health Platform
*App name pending — see BRD OI-1. Use the `[APP_NAME]` placeholder in code and copy until it is decided.*

**Companion to:** `business-requirements.md`, `tech_stack.md`
**Version:** 0.2 (Draft) · **Date:** August 2026

> **Scope.** Visual language, tokens, and the component inventory. Screen-by-screen layouts and user flows belong in a separate UI spec.

---

## 1. Design Principles

Four rules, derived from what the platform is actually for. When a decision is unclear, these break the tie.

1. **Readable under stress, on a cheap phone.** Someone may be reading this in the dark, on 3G, while water rises. Large tap targets, high contrast, no thin grey text on white. **Design at 360px first** (Section 9).
2. **Emergency information outranks everything.** An active alert takes the top of the screen (BR-0.18). The hotline is always one tap away (BR-0.15).
3. **Always say how fresh the data is.** Every reading carries a timestamp, and stale data is visibly marked (BR-3.8). A number with no age is a lie waiting to happen.
4. **Trustworthy, not flashy.** This represents a barangay government. Restrained, institutional, competent — the 3D map is the one place to be showy.

---

## 2. Brand

### Name

`[APP_NAME]` throughout. Define it once as a constant and reference it everywhere, so the rename is a one-line change:

```ts
// lib/brand.ts
export const APP_NAME = "[APP_NAME]";
export const APP_TAGLINE = "[TAGLINE]";
export const BARANGAY = "Barangay San Jose, Rodriguez, Rizal";
```

### Logo

Not yet designed. Reserve the slot and build against a placeholder component so the swap is trivial.

| Context | Size | Form |
|---|---|---|
| Public navbar | 40px height | Full lockup — mark + wordmark |
| Admin sidebar | 32px mark + wordmark | Mark + name + "ADMIN PORTAL" descriptor beneath, as in the reference |
| Collapsed sidebar | 32px | Mark only |
| Favicon / app icon | 32, 180, 512 | Mark only |
| Footer | 40px | Full lockup, single colour |

Requirements for whoever designs it: legible at 32px, works on both `primary-950` (dark sidebar) and white, and has a mark that stands alone.

---

## 3. Colour

### 3.1 Primary — Forest Green

The institutional green from the references: deep and slightly desaturated, not a bright commercial green.

| Token | Hex | Used for |
|---|---|---|
| `primary-50` | `#F2FAF5` | Table row tint, section backgrounds |
| `primary-100` | `#DFF3E6` | Badge backgrounds, avatar fills, hover states |
| `primary-200` | `#BFE7CE` | Borders on tinted surfaces |
| `primary-300` | `#92D4AC` | Chart fills, disabled primary |
| `primary-400` | `#5BB983` | Accents on dark backgrounds |
| `primary-500` | `#2E9D62` | Success text, positive indicators |
| `primary-600` | `#1F8049` | **Primary buttons**, links, active states |
| `primary-700` | `#196A3D` | Primary button hover |
| `primary-800` | `#17532F` | **Table headers**, stat bands, dark buttons |
| `primary-900` | `#123F25` | Deep surfaces |
| `primary-950` | `#0C2A19` | **Sidebar**, top utility bar, darkest panels |

### 3.2 Neutrals

| Token | Hex | Used for |
|---|---|---|
| `neutral-50` | `#F8FAFA` | App background |
| `neutral-100` | `#F1F4F3` | Subtle fills |
| `neutral-200` | `#E3E8E6` | Borders, dividers |
| `neutral-300` | `#CBD3D0` | Input borders |
| `neutral-400` | `#9AA5A1` | Placeholder text, disabled |
| `neutral-500` | `#6B7772` | Secondary text |
| `neutral-600` | `#4E5A55` | Body text on light |
| `neutral-700` | `#3A4541` | Strong body text |
| `neutral-800` | `#252E2B` | Headings |
| `neutral-900` | `#141A18` | Display headings |

Neutrals carry a slight green cast so they sit naturally beside the primary scale.

### 3.3 Semantic

| Purpose | Text/Icon | Background | Border |
|---|---|---|---|
| **Success** | `#15803D` | `#DCFCE7` | `#BBF7D0` |
| **Warning** | `#B45309` | `#FEF3C7` | `#FDE68A` |
| **Danger** | `#B91C1C` | `#FEE2E2` | `#FECACA` |
| **Info** | `#1D4ED8` | `#DBEAFE` | `#BFDBFE` |

> Success is a *different* green from `primary-600` on purpose. When the whole interface is green, a green "verified" badge reads as decoration. The success green is brighter and used only for state.

### 3.4 Domain palettes

These are not decorative. Each maps to a defined concept in the BRD, and the mapping must stay consistent everywhere it appears.

**River alert levels** (BR-3.2)

| Level | Meaning | Colour | Background |
|---|---|---|---|
| Normal | Below threshold | `#15803D` | `#DCFCE7` |
| **1 · Prepare** | Ready to move | `#B45309` | `#FEF3C7` |
| **2 · Evacuate** | Move now | `#C2410C` | `#FFEDD5` |
| **3 · Forced Evacuation** | Mandatory | `#B91C1C` | `#FEE2E2` |

**Flood hazard** (Project NOAH / LiPAD hazard attribute, tech_stack Section 6)

Matches the **official Philippine hazard map convention** used by UP NOAH, LiPAD, MGB, and PHIVOLCS. Do not invent a different ramp.

| Value | Level | Depth | Fill | Opacity |
|---|---|---|---|---|
| `1` | Low | 0–0.5 m | `#FFED4A` | 0.55 |
| `2` | Medium | 0.5–1.5 m | `#F59E0B` | 0.60 |
| `3` | High | >1.5 m | `#EF4444` | 0.60 |
| — | Area assessed, no hazard | — | `#E5E7EB` | 0.35 |
| — | Area not assessed | — | hatched `#9CA3AF` | 0.25 |

> **Why not a custom palette.** An earlier draft specified blue on the reasoning that water reads as blue and it would separate hazard depth from alert urgency. That was wrong. Residents and barangay officials have seen yellow/orange/red on every hazard map the government has ever published; re-teaching them a private colour scheme costs more than the visual conflict it avoids. Match the convention.
>
> **Handling the overlap with alert levels.** Hazard and alert levels now share warm hues, which is acceptable because they never appear in the same visual form: hazard is a **translucent map polygon**, alert level is a **solid badge or banner with a number and a word**. Keep that distinction absolute — never render an alert level as a map fill, and never render hazard as a badge.

**Household vulnerability** (BR-1.48)

| Level | Colour | Background |
|---|---|---|
| Low | `#15803D` | `#DCFCE7` |
| Moderate | `#CA8A04` | `#FEF9C3` |
| High | `#C2410C` | `#FFEDD5` |
| **Priority** | `#B91C1C` | `#FEE2E2` |

**Nutrition status** — provisional until the Nutrition lead specifies (OI-2). Reserve a diverging ramp: deficit (amber → red), normal (green), excess (blue → violet).

**Safety status** (M5)

| Status | Colour |
|---|---|
| Safe — confirmed individually | `#15803D` solid |
| Safe — via household action | `#15803D` outlined *(BR-5.1c: lower confidence, shown differently)* |
| Unaccounted for | `#6B7772` |
| Needs rescue | `#B91C1C` + pulse animation |

### 3.5 Chart palette (M10)

Ordered for categorical series. Colour-blind safe and distinguishable in greyscale.

```
1  #1F8049   forest      5  #7C3AED   violet
2  #F59E0B   amber       6  #DB2777   pink
3  #2563EB   blue        7  #0891B2   cyan
4  #DC2626   red         8  #65A30D   lime
```

Convention from the reference dashboard: **solid lines are actuals, dashed lines are forecasts.** Keep it.

### 3.6 CSS variables

shadcn/ui convention, HSL triplets. Drop into `globals.css`.

```css
@layer base {
  :root {
    --background: 180 20% 98%;
    --foreground: 160 10% 9%;

    --card: 0 0% 100%;
    --card-foreground: 160 10% 9%;

    --popover: 0 0% 100%;
    --popover-foreground: 160 10% 9%;

    --primary: 149 61% 31%;          /* primary-600 #1F8049 */
    --primary-foreground: 0 0% 100%;

    --secondary: 150 44% 91%;        /* primary-100 */
    --secondary-foreground: 150 53% 21%;

    --muted: 160 8% 95%;
    --muted-foreground: 160 5% 45%;

    --accent: 150 44% 91%;
    --accent-foreground: 150 53% 21%;

    --destructive: 0 72% 42%;
    --destructive-foreground: 0 0% 100%;

    --border: 160 8% 89%;
    --input: 160 8% 82%;
    --ring: 149 61% 31%;

    --radius: 0.75rem;

    /* Surfaces not covered by shadcn defaults */
    --surface-dark: 150 55% 11%;     /* primary-950 — sidebar, utility bar */
    --surface-header: 150 53% 21%;   /* primary-800 — table headers */
    --surface-tint: 150 50% 97%;     /* primary-50 — striped rows */

    /* Charts */
    --chart-1: 149 61% 31%;
    --chart-2: 38 92% 50%;
    --chart-3: 221 83% 53%;
    --chart-4: 0 72% 51%;
    --chart-5: 262 83% 58%;
  }
}
```

> **Dark mode is out of scope for now.** Barangay staff use this in a daylight office, residents on phones outdoors. Structure the tokens so it can be added later, but do not spend time on it — it is a second full theme to test (R-8).

---

## 4. Typography

### Families

| Role | Font | Why |
|---|---|---|
| **Display** — page titles, hero, stat numbers | **Plus Jakarta Sans** | Geometric and confident, matching the reference headlines. Free, on Google Fonts, has the weights needed |
| **UI/Body** — everything else | **Inter** | The most legible screen typeface at small sizes; excellent tabular figures |
| **Mono** — reference numbers, coordinates, codes | **JetBrains Mono** | Only where character disambiguation matters |

Load through `next/font` with `display: "swap"` and subset to `latin`.

### Scale

Two columns: **mobile is the base value, desktop scales up at `md`.** A 60px headline on a 360px screen wraps to four lines and pushes everything below the fold.

| Token | Mobile (base) | Desktop (`≥md`) | Weight | Use |
|---|---|---|---|---|
| `display-xl` | 34 / 40 | 60 / 64 | 800 | Public hero headline |
| `display-lg` | 30 / 36 | 44 / 50 | 800 | Stat band numbers |
| `display-md` | 28 / 34 | 34 / 40 | 700 | KPI values |
| `h1` | 24 / 32 | 30 / 38 | 700 | Page title |
| `h2` | 20 / 28 | 24 / 32 | 700 | Section heading |
| `h3` | 18 / 26 | 20 / 28 | 600 | Card title |
| `h4` | 16 / 24 | 16 / 24 | 600 | Sub-heading |
| `body-lg` | 16 / 26 | 17 / 28 | 400 | Public site body |
| `body` | 15 / 24 | 15 / 24 | 400 | Default UI |
| `body-sm` | 13 / 20 | 13 / 20 | 400 | Secondary, captions |
| `label` | 13 / 16 | 13 / 16 | 600 | Form labels |
| `overline` | 11 / 16 | 11 / 16 | 700, `0.08em` tracking, uppercase | Card labels, table headers, eyebrows |
| `caption` | 11 / 16 | 11 / 16 | 400 | Timestamps, helper text |

Body and below do **not** shrink on mobile. Only display and heading sizes scale — shrinking body text to fit more content is exactly wrong for this audience.

### Rules

- **`overline` is the signature.** Uppercase, letterspaced, muted — used for every KPI label, table header, and eyebrow. It carries most of the institutional feel.
- **Tabular figures on all numbers in tables and KPIs** — `font-variant-numeric: tabular-nums`. Without it, digits jitter as values update.
- **Never go below 13px** for content a resident reads. The public site minimum is 15px.
- **Two-tone headlines** on the public site: first line `neutral-900`, second line `primary-600` with an underline accent, as in the reference.

---

## 5. Layout & Spacing

### Spacing scale

4px base: `1(4) 2(8) 3(12) 4(16) 5(20) 6(24) 8(32) 10(40) 12(48) 16(64) 20(80) 24(96)`

### Shell dimensions

| Element | Mobile (`<lg`) | Desktop (`≥lg`) |
|---|---|---|
| Admin sidebar | Hidden — opens as a `sheet` | `256px` expanded · `72px` collapsed |
| Admin topbar | `56px` | `64px` |
| Public utility bar | Hidden — moves to footer | `36px` |
| Public navbar | `60px` | `72px` |
| Content gutters | `16px` | `24px`, max width `1440px` |
| Card padding | `16px` | `24px` |
| Between cards | `16px` | `32px` |
| Between sections | `32px` | `48px` |

Full responsive behaviour in Section 9.3.

### Radius

| Token | Value | Use |
|---|---|---|
| `sm` | 6px | Badges, small chips |
| `md` | 10px | Inputs, buttons |
| `lg` | 14px | Cards |
| `xl` | 20px | Feature panels, the dark KPI panel |
| `full` | 9999px | Pills, avatars, CTA buttons on the public site |

> The public site uses **fully rounded pill buttons**; the admin console uses **`md` radius**. That difference is deliberate — it signals "public brochure" versus "working tool."

### Elevation

| Token | Shadow | Use |
|---|---|---|
| `flat` | none, `1px` border `neutral-200` | Default card. **Most cards should use this** |
| `sm` | `0 1px 3px rgb(0 0 0 / 0.06)` | Hover on interactive cards |
| `md` | `0 4px 12px rgb(0 0 0 / 0.08)` | Dropdowns, popovers |
| `lg` | `0 12px 32px rgb(0 0 0 / 0.12)` | Modals, floating cards |
| `emergency` | `0 0 0 3px` danger-200 | Active alert banner |

Prefer borders over shadows. The reference interface is almost entirely flat with hairline borders, which is what makes dense tables readable.

### Motion

| Token | Duration | Easing |
|---|---|---|
| `instant` | 100ms | `ease-out` — hovers, small state |
| `fast` | 180ms | `ease-out` — dropdowns, tabs |
| `base` | 240ms | `cubic-bezier(0.2, 0, 0, 1)` — sheets, modals |
| `slow` | 400ms | same — page transitions |

Respect `prefers-reduced-motion`: disable the rescue-status pulse and all transforms, keep opacity fades.

---

## 6. Iconography

**lucide-react**, ships with shadcn/ui.

| Context | Size | Stroke |
|---|---|---|
| Inline with text | 16 | 2 |
| Buttons, table actions | 18 | 2 |
| Sidebar nav | 20 | 2 |
| Section headers | 20 in a 40px rounded-square tinted container | 2 |
| KPI card corner | 18 in a 32px rounded-square | 2 |
| Empty states | 40 | 1.5 |

**Fixed icon assignments** — keep these stable so users learn them:

| Concept | Icon |
|---|---|
| Household / registry | `Users` |
| Member | `User` |
| Map / area | `Map`, `MapPin` |
| Flood / water level | `Waves` |
| Weather | `CloudRain` |
| Alert | `TriangleAlert` |
| Safe | `ShieldCheck` |
| Rescue | `LifeBuoy` |
| Evacuation center | `Building2` |
| Donation | `HandHeart` |
| Activity | `CalendarDays` |
| Preparedness guide | `BookOpen` |
| Analytics | `BarChart3` |
| Health worker | `Stethoscope` |
| Hotline | `Phone` |

---

## 7. Component Library

Two layers. **Install the shadcn primitives, then build the app's own composites on top of them** — never restyle a shadcn component in place, and never use a raw primitive directly in a page.

```
components/
├── ui/          ← shadcn primitives, installed via CLI. Do not edit except for token wiring
├── common/      ← app composites built FROM ui/. This is what pages import
└── features/    ← domain components (registry, map, alerts, donations…)
```

### 7.1 shadcn/ui primitives to install

```bash
npx shadcn@latest add \
  accordion alert alert-dialog avatar badge breadcrumb button calendar card \
  chart checkbox collapsible command dialog dropdown-menu form hover-card \
  input label navigation-menu pagination popover progress radio-group \
  scroll-area select separator sheet sidebar skeleton slider sonner switch \
  table tabs textarea toggle tooltip
```

| Primitive | Used by |
|---|---|
| `button`, `input`, `label`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `form` | Registration, all admin forms |
| `table` | DataTable |
| `badge` | Every status indicator |
| `card` | Every panel |
| `avatar` | User identity cells |
| `dropdown-menu`, `popover`, `hover-card`, `tooltip` | Row actions, filters, info hints |
| `dialog`, `alert-dialog`, `sheet` | Modals, confirmations, mobile nav |
| `tabs` | Analytics tab row |
| `sidebar` | Admin shell — shadcn's sidebar handles collapse and mobile |
| `breadcrumb` | Admin topbar |
| `pagination` | Table footers |
| `sonner` | Toasts |
| `skeleton` | Loading states |
| `command` | Global search (⌘K), area pickers |
| `calendar` | Activity scheduling, date filters |
| `chart` | Recharts wrapper for M10 |
| `progress` | Donation drive targets, evacuation occupancy |
| `alert` | Inline warnings |
| `accordion`, `collapsible` | FAQs, preparedness guides |
| `scroll-area` | Long lists |
| `separator` | Dividers |

### 7.2 Custom composites — `components/common/`

These are the app's actual vocabulary. Each is built from primitives above.

#### Layout

| Component | Description |
|---|---|
| `PublicShell` | Utility bar + navbar + content + footer |
| `AdminShell` | Sidebar + topbar + content region |
| `TopUtilityBar` | `primary-950` strip: phone, address, office hours. `36px`, `body-sm`, white |
| `PublicNavbar` | White, `72px`. Logo left, nav centre, Login (filled pill) + Register (outline pill) right. Collapses to a `sheet` on mobile |
| `AdminSidebar` | `primary-950`, `256px`. Logo block, nav items, `Support` and `Sign Out` pinned to the bottom — Sign Out in danger red |
| `AdminTopbar` | White, `64px`. Breadcrumb left; mode badge, notification bell with dot, help, settings, user identity right |
| `PageHeader` | Title + optional description + right-aligned action slot |
| `SectionHeader` | Tinted rounded-square icon + title + description line. Used at the top of every content card |
| `Footer` | Barangay info, contacts, socials, hotline, copyright (BR-0.12) |

#### Data display

| Component | Description |
|---|---|
| `DataTable` | TanStack Table + shadcn `table`. Sorting, filtering, pagination, row selection, sticky header, empty and loading states. **The single most reused component in the admin console — build it properly once** |
| `StatCard` | White card, `overline` label, `display-md` value, optional caption and trend |
| `KpiPanel` | The dark green feature panel: `primary-900` → `primary-950` gradient, `xl` radius, translucent KPI cards inside, icon chips |
| `MetricCard` | Tinted variant with a coloured left border — green/amber/red — for accuracy and threshold metrics |
| `StatusBadge` | `badge` wrapper mapping a domain status to its palette (Section 3.4). Variants: `verified`, `pending`, `safe`, `unaccounted`, `needs-rescue`, `alert-1/2/3`, `vulnerability-*` |
| `TagList` | Row of small outline pills with a `+N` overflow chip — the systems column in the reference |
| `UserIdentityCell` | Avatar with initials (`primary-100` fill, `primary-800` text) + name + email stacked |
| `RelativeDateCell` | Absolute date above, relative time below in `caption` |
| `DataFreshness` | Timestamp + source + a **stale** marker past a threshold. **Required on every weather and river reading** (BR-3.8) |
| `EmptyState` | Icon, title, description, optional action |
| `TableSkeleton` / `CardSkeleton` | Loading placeholders |
| `ErrorState` | Failure message + retry. Section-level, so one dead feed does not blank the page (BR-0.17) |

#### Controls

| Component | Description |
|---|---|
| `Button` | Wraps shadcn `button`. Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`, `emergency`. Sizes `sm/md/lg`. `pill` prop for the public site |
| `SearchInput` | Input with leading search icon and clear affordance |
| `FilterBar` | Search + filter popovers + active-filter chips + reset |
| `RowActions` | Icon button group — view / verify / permissions — each with a `tooltip`. **On touch, becomes a bottom `sheet` with labelled full-width items** (Section 9.5), not a hover dropdown |
| `ConfirmDialog` | `alert-dialog` wrapper. Destructive actions require typed confirmation |
| `LanguageToggle` | Filipino ⇄ English (BR-0.19) |
| `Stepper` | Multi-step registration progress |

#### Emergency-specific

| Component | Description |
|---|---|
| `EmergencyAlertBanner` | Full-width takeover at the top of the page when an alert is active (BR-0.18). Danger palette, alert level, instruction, timestamp. Not dismissible while active |
| `HotlineButton` | Persistent floating action, always reachable without scrolling (BR-0.15). `tel:` links on mobile |
| `HotlineList` | One-tap callable directory (BR-0.7) |
| `AlertLevelIndicator` | Three-segment gauge showing current river alert level with the threshold value |
| `SafetyStatusControl` | Per-member and whole-household marking. **The bulk action lists the members it covers and requires explicit confirmation** (BR-5.1b) |
| `RescueRequestForm` | Works without an account (BR-5.9). Minimal fields, large tap targets |

#### Maps

| Component | Description |
|---|---|
| `HazardMap` | Leaflet + OSM. Hazard polygon layers, facility pins, layer toggles, legend, attribution |
| `LocationPicker` | **Draggable pin, primary path.** GPS button appears only when `window.isSecureContext` is true (tech_stack Section 9) |
| `ZoneMap3D` | React Three Fiber. Extruded area polygons coloured by risk. Orbit controls, click-to-select, `Suspense` fallback |
| `MapLegend` | Shared legend, driven by the domain palettes in Section 3.4 |

### 7.3 Component specs

**Buttons**

| Variant | Fill | Text | Border | Hover |
|---|---|---|---|---|
| `primary` | `primary-600` | white | — | `primary-700` |
| `secondary` | `primary-100` | `primary-800` | — | `primary-200` |
| `outline` | white | `neutral-700` | `neutral-300` | `neutral-50` |
| `ghost` | transparent | `neutral-600` | — | `neutral-100` |
| `danger` | `#B91C1C` | white | — | `#991B1B` |
| `emergency` | `#B91C1C` | white | — | pulse animation, larger size |

Heights: `sm` 32 · `md` 40 · `lg` 48.

**Tap targets:** 44×44 minimum on touch, **48×48 for anything used during an emergency** — safety check-in, rescue request, hotline. Where a visual button is smaller than its target, pad the hit area rather than enlarging the button (Section 9.7).

**Table** (matching the reference)

- Header: `primary-800` background, white `overline` text, sort arrows
- Rows: white / `primary-50` alternating, `neutral-200` hairline separators
- Row hover: `primary-50`; selected: `primary-100`
- Cell padding: `12px 16px`; row height `64px` where a cell has two lines
- Sticky header on scroll
- Footer: `primary-50`, result count left, pagination right
- Pagination: active page is a filled `primary-800` square

**Badges**

`sm` radius, `11px` weight 600, `2px 8px` padding, background + text from the relevant palette. Outline variant for neutral tags.

**Cards**

White, `lg` radius, `1px` `neutral-200` border, no shadow at rest. `24px` padding. `SectionHeader` at the top where the card has a title.

**Forms**

- Labels above inputs, `label` token
- Input height `40px`, `md` radius, `neutral-300` border, `ring` on focus
- Errors below in danger text with an icon — never colour alone
- Required marked with `*` **and** described in the field's helper text
- Group household member fields into repeatable collapsible cards

---

## 8. Public Site vs Admin Console

The same tokens, deliberately different personalities.

| | Public site | Admin console |
|---|---|---|
| Density | Generous — `48px+` section spacing | Compact — `24px` |
| Radius | `full` on buttons, `xl` on cards | `md` on buttons, `lg` on cards |
| Type | `body-lg` (17px) | `body` (15px) |
| Imagery | 3D illustration, photography | None — data only |
| Colour | Green gradients, tinted hero panels | White surfaces, green accents |
| Motion | Scroll reveals, carousel | Minimal — state changes only |
| Goal | Reassure and inform | Get work done quickly |

---

## 9. Responsive & Device Strategy

### 9.1 Who is on what

Responsiveness is not one problem here. Different users hit this from genuinely different devices, and two of the flows are **mobile-first, not mobile-tolerant**.

| User | Primary device | Priority |
|---|---|---|
| Resident — public site | Low-end Android phone, 360–412px, slow connection | **Mobile-first** |
| Resident — portal, safety check-in | Same phone, possibly during a flood | **Mobile-first** |
| **BHW — assisted registration** | Phone or budget tablet, standing in someone's doorway | **Mobile-first.** This is field data entry, not desk work |
| Barangay admin — console | Desktop in the barangay hall | Desktop-first, must remain usable on tablet |
| BDRRMC — during an emergency | Whatever is in their hand | **All admin emergency screens must work on a phone** |

> **The BHW case is the one usually missed.** BR-1.2 and BR-1.36 describe a health worker registering a whole household — head plus every member, with nutrition indicators — in a single visit. That is a long form completed one-handed, on a phone, possibly outdoors in sunlight, likely offline-ish. Designing it desktop-first and shrinking it will not work.

### 9.2 Breakpoints

Tailwind defaults, with a note on what each actually represents here.

| Token | Min width | Represents |
|---|---|---|
| *(base)* | 320px | Smallest Android phones — **must not break** |
| `sm` | 640px | Large phones, small phones landscape |
| `md` | 768px | Tablets portrait |
| `lg` | 1024px | Tablets landscape, small laptops — **admin sidebar appears here** |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop |

**Design at 360px first.** If it works there it works everywhere; the reverse is not true.

### 9.3 Shell behaviour

| Component | `<lg` | `≥lg` |
|---|---|---|
| `AdminSidebar` | Hidden; opens as a `sheet` from a hamburger in the topbar | Fixed 256px, collapsible to 72px |
| `AdminTopbar` | 56px. Breadcrumb truncates to the current page; secondary icons move into an overflow menu; user identity becomes avatar-only | Full 64px |
| `PublicNavbar` | Logo + hamburger; nav in a `sheet`. **Login and the hotline stay visible outside the menu** | Full horizontal nav |
| `TopUtilityBar` | Hidden — the information moves to the footer. Exception: hotline number stays | Full strip |
| `PageHeader` | Title stacks above actions; actions become full-width or an overflow menu | Title left, actions right |
| Content gutters | 16px | 24px |
| Card padding | 16px | 24px |

### 9.4 DataTable on small screens — the hard one

An eight-column table with badges and stacked cells does not fit 360px, and horizontal scrolling through a directory is miserable. `DataTable` therefore ships **three** modes, chosen per table rather than globally.

| Mode | Behaviour | Use for |
|---|---|---|
| **`cards`** *(default below `md`)* | Each row renders as a stacked card: identity at top, key fields as label/value pairs, badges in a row, actions as a full-width button row | User Management, household registry, rescue queue — anything a BHW or admin browses on a phone |
| **`priority`** | Columns carry a priority; low-priority ones drop progressively as width shrinks. A row expands to reveal hidden fields | Tables where column comparison matters — analytics, donation drives |
| **`scroll`** | Horizontal scroll with the first column sticky and a visible scroll affordance | Last resort — wide numeric tables only |

Regardless of mode, on touch: **row actions become a bottom `sheet`**, not a hover dropdown. There is no hover on a phone, and a 32px icon in a row is not a reliable tap target.

```tsx
<DataTable
  columns={columns}
  data={households}
  mobileVariant="cards"
  mobileCard={{
    title: (r) => r.headName,
    subtitle: (r) => r.areaName,
    fields: ["members", "vulnerability", "registeredAt"],
  }}
/>
```

### 9.5 Component-level rules

| Component | Small-screen behaviour |
|---|---|
| `KpiPanel` | 6 cards → 2 columns at `sm`, horizontal snap-scroll carousel below that. Never a 6-row stack — it buries the content beneath |
| `StatCard` | Full width stacked; `display-md` drops to 28px |
| `FilterBar` | Collapses to a single "Filters" button opening a `sheet`. Active filter chips stay visible above the list |
| `SearchInput` | Full width, always visible — never hidden behind an icon |
| `RowActions` | Bottom `sheet` with labelled full-width items |
| Charts | Fixed 240px height, legend below not beside, fewer x-axis ticks, tooltip on tap. **Consider a summary table fallback** — a 6-series line chart on 360px is unreadable |
| Forms | Single column always. Sticky footer for the primary action. `inputMode` set correctly — `numeric` for age and weight, `tel` for phone |
| **Member repeater** (BHW registration) | One member per collapsible card, one open at a time. Progress indicator: "Member 2 of 5". Sticky "Add member" and "Save". **Draft persisted locally as they type** — see Section 9.6 |
| `HazardMap` | Full-bleed, min 320px tall. Layer toggles in a bottom sheet, not a side panel. Legend collapsible |
| `ZoneMap3D` | See Section 9.6 |
| `EmergencyAlertBanner` | Full width, sticky at top, above everything including the navbar |
| `HotlineButton` | Fixed bottom-right FAB, 56px, above all content and safe-area inset aware |
| `Dialog` | Becomes a bottom `sheet` below `md` — easier to reach one-handed |
| `Tabs` | Horizontal scroll with snap; never wrap to two rows |

### 9.6 Performance on low-end devices

BR-0.16 requires the public site to be usable on cheap phones over congested connections. That is a design constraint, not just an engineering one.

| Concern | Rule |
|---|---|
| **3D map** | `ZoneMap3D` is **desktop and tablet only** by default. Below `md`, or where `navigator.hardwareConcurrency ≤ 4`, render a static image or the 2D Leaflet map instead. Provide an explicit "View 3D map" opt-in. R3F on a low-end Android will drain battery and stutter |
| Public landing hero | The 3D illustration ships as an optimised static image below `md`, not a live scene |
| Images | `next/image`, AVIF/WebP, explicit dimensions to prevent layout shift |
| Fonts | Two families maximum, `display: swap`, latin subset only |
| Maps | Hazard GeoJSON pre-simplified (tech_stack Section 6). Load tiles lazily; never on first paint of the landing page |
| Charts | Import Recharts dynamically — it is heavy and only the analytics page needs it |
| Bundle | Route-level code splitting. Public landing page should be usable well before the portal bundle loads |

**Unreliable connections.** A BHW filling a long household form in an alley will lose signal mid-form, and losing twenty minutes of entered data will stop them using the platform entirely.

Full offline support is **not** in scope — it means a service worker, local storage, and conflict resolution, which is a project of its own against R-8. But the cheap mitigation is worth building:

- **Persist form state locally as the user types** (`localStorage`, keyed by draft ID). Restore on return with a clear "Resume draft?" prompt.
- **Queue the submit and retry** rather than failing outright. Show "Saved locally — will upload when connected."
- **Never clear the form on a failed submit.** This is the single most common way field data-entry tools lose people's trust.

Full offline sync is logged as a future consideration (D-OI-8), not a commitment.

### 9.7 Touch and ergonomics

| Rule | Detail |
|---|---|
| Tap targets | **44×44 minimum**, 48×48 for anything used during an emergency |
| Spacing between targets | ≥8px — mis-taps in a rescue form are costly |
| Thumb zone | Primary actions in the lower third. Sticky form footers, bottom sheets, bottom-right FAB |
| No hover-only affordances | Anything revealed on hover must have a tap equivalent |
| Safe areas | Respect `env(safe-area-inset-*)` for notches and home indicators |
| Orientation | Both supported. Tables and maps benefit from landscape; nothing may *require* it |
| Sunlight | Contrast floor above WCAG AA on outdoor screens — another reason the palette avoids light grey on white |

### 9.8 Testing matrix

Minimum before the pitch:

| Device class | Width | Why |
|---|---|---|
| Small Android | 360px | The realistic resident device |
| Standard phone | 390–412px | Most common |
| Tablet portrait | 768px | BHW field device |
| Tablet landscape / small laptop | 1024px | Sidebar breakpoint boundary |
| Desktop | 1440px | Barangay hall, and the pitch projector |

Test the **deployed** URL on a real phone, not just the browser's device emulator — emulators do not reproduce touch accuracy, real network conditions, or the secure-context behaviour noted in tech_stack Section 9 (T-9).

---

## 10. Accessibility

Not optional — this is a government service used under stress.

| Requirement | Standard |
|---|---|
| Contrast | WCAG AA: 4.5:1 body, 3:1 for large text and UI boundaries. **`primary-600` on white passes; `primary-400` does not — never use it for text on light** |
| Never colour alone | Every status carries an icon or text label as well. Alert levels always show the number |
| Focus | Visible 2px `ring` on every interactive element. Never remove outlines |
| Tap targets | 44×44 minimum on touch |
| Keyboard | Full traversal; modals trap focus; Esc closes |
| Screen readers | Landmarks, live regions for alerts, alt text on map imagery |
| Motion | Honour `prefers-reduced-motion` |
| Zoom | Usable at 200% without horizontal scrolling |

**Alert banners must announce via `aria-live="assertive"`.** A resident using a screen reader needs to hear an evacuation order without hunting for it.

---

## 11. Language

Filipino is primary, English secondary (BR-0.19).

- Allow **~30% more width** than the English string for Filipino equivalents — buttons and labels must not clip
- Never concatenate translated fragments; use full parameterised strings
- Keep hotline numbers, area names, and facility names untranslated
- Dates in Filipino locale on the public site

---

## 12. Implementation Order

Aligns with the build order in BRD 8.

| Stage | Deliverable |
|---|---|
| 1 | Tokens in `globals.css` + Tailwind config; fonts; `Button`, `Card`, `Badge`, `SectionHeader` |
| 2 | `AdminShell` (sidebar + topbar) and `PublicShell`; `PageHeader` — **including the `<lg` sheet behaviour, not as a follow-up** |
| 3 | **`DataTable`** with its `cards` mobile variant — everything in the admin console depends on it |
| 4 | `StatCard`, `KpiPanel`, `StatusBadge`, `EmptyState`, skeletons |
| 5 | Emergency components — `EmergencyAlertBanner`, `HotlineButton`, `SafetyStatusControl` |
| 6 | Map components, including the `<md` fallback for `ZoneMap3D` |
| 7 | Chart theming for M10 |

> Build the shell and `DataTable` before any feature screen. Both are used by nearly every page, and retrofitting them later means touching everything.

> **Build responsive from the start, not as a pass at the end.** Retrofitting a mobile variant onto `DataTable` after ten screens depend on it is the single most expensive rework available on this project. Do 360px first for every component.

---

## 13. Open Design Decisions

| # | Item | Owner |
|---|---|---|
| D-OI-1 | **App name and tagline** (BRD OI-1) — blocks the logo and the hero section | Whole team |
| D-OI-2 | **Logo design** — mark + wordmark, per Section 2 | Whoever on the team has design skills |
| D-OI-3 | Confirm **Plus Jakarta Sans + Inter**, or substitute | Whole team |
| D-OI-4 | **Nutrition status colour ramp** — depends on the indicator set (BRD OI-2) | Nutrition lead + IT lead |
| D-OI-5 | Whether the **3D map** is a hero element on the public landing page or admin-only. Note Section 9.6 — it is desktop/tablet only regardless, with a 2D fallback on phones | Whole team |
| D-OI-7 | **Which tables use which mobile variant** (Section 9.4) — decide per table as each screen is designed | IT lead |
| D-OI-8 | **Offline support for BHW field registration** — local draft persistence is in scope (Section 9.6); full offline sync with conflict resolution is not. Revisit only if field testing shows drafts are insufficient | IT lead |
| D-OI-9 | **Print stylesheet** for exported reports (BR-10.7) — the barangay will print for MDRRMO submission. Low effort, easy to forget | IT lead |
| D-OI-6 | **Barangay seal usage** — whether the official seal appears, and any LGU brand rules that constrain the palette | PubAd lead, via barangay |
