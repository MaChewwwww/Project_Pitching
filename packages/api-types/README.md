# `packages/api-types`

TypeScript types generated from the API's OpenAPI schema. **Never hand-edited.**

```
FastAPI route + Pydantic schema
        ↓  make types
  packages/api-types/openapi.json          (gitignored — intermediate)
        ↓  openapi-typescript
  packages/api-types/src/generated.ts      (committed)
        ↓  imported by
  apps/web/src/lib/api/*
```

## Regenerate after any API schema change

```bash
make types
```

Commit the diff **in the same PR** as the API change.

## Why `generated.ts` is committed

So CI can diff it. If a PR changes an API response without regenerating, CI regenerates and
finds a difference, and the `types` job fails loudly. Relying on everyone remembering `make
types` does not work (`architecture.md` AR-9).

Committing it also means `npm ci` produces a buildable frontend without a running API.

## Types are not enough on their own

TypeScript types are erased at runtime. A backend change that somehow slips past CI would still
render as `undefined` on a dashboard.

So responses are also **Zod-parsed at runtime** in `apps/web/src/lib/api/`. Together, drift
surfaces as a type error at build time *and* a clear runtime error — never as a silently missing
value (`architecture.md` AR-7).
