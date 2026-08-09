# syntax=docker/dockerfile:1
#
# Build context is the **repository root**, not apps/web — npm workspaces hoist
# node_modules there, and the standalone tracer needs the whole workspace.
# See infra/compose.yml.

# --- deps: install once, cached on the lockfile ------------------------------
FROM node:22-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/api-types/package.json packages/api-types/

RUN npm ci && mkdir -p /repo/apps/web/node_modules

# --- builder -----------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /repo

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules

# NEXT_PUBLIC_* is inlined at build time, so it has to be present here and not
# only at run time.
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN npm run build --workspace=apps/web

# --- runner ------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /repo

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone keeps the workspace layout: server.js sits under apps/web.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]

# --- dev: hot reload, source bind-mounted over this by compose.override -------
FROM node:22-alpine AS dev
WORKDIR /repo

ENV NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY package.json package-lock.json ./

EXPOSE 3000
WORKDIR /repo/apps/web
CMD ["npx", "next", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
