# `features/` — domain components

One directory per module, mirroring `apps/api/src/modules/`: `registry/`, `map/`,
`alerts/`, `safety/`, `evacuation/`, `donations/`, `activities/`, `preparedness/`,
`analytics/`.

Feature components compose `common/` composites. They may fetch data (via TanStack
Query hooks in `hooks/`); `common/` components should not.
