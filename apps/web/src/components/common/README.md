# `common/` — the app's own vocabulary

Composites built **from** `ui/` primitives. This is what pages import; a page
never uses a raw shadcn primitive directly, and a shadcn primitive is never
restyled in place (design.md Section 7, NFR-MNT-006).

Inventory and specs: `docs/design.md` Section 7.2.

Build order (design.md Section 12) — the shell and `DataTable` come before any
feature screen, because nearly every page depends on both and retrofitting them
later means touching everything:

1. `Button`, `Card`, `Badge`, `SectionHeader`
2. `AdminShell`, `PublicShell`, `PageHeader` — including the `<lg` sheet behaviour
3. `DataTable` with its `cards` mobile variant
4. `StatCard`, `KpiPanel`, `StatusBadge`, `EmptyState`, skeletons
5. `EmergencyAlertBanner`, `HotlineButton`, `SafetyStatusControl`
6. Map components, including the `<md` fallback for `ZoneMap3D`
7. Chart theming
