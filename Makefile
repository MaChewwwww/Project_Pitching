# The single entry point for this repo (docs/architecture.md Section 12.3).
# Prefer these over ad-hoc commands so what you run locally matches what CI runs.
#
# Windows: install GNU Make once with  winget install ezwinports.make
# Recipes below stay portable between cmd.exe and sh — no cp, no rm, no &&-chained
# shell builtins. Anything filesystem-ish goes through python or docker.
#
# --- Environments (architecture.md Section 13.1) ----------------------------
# ENV selects which isolated profile to run: staging (default) or demo.
# Each is its own Compose project — separate database, volumes, and ports — so
# testing a feature in staging can never corrupt the seeded scenario sitting
# ready for the pitch, and both can run on the same machine at once:
#
#   make dev                # staging — the day-to-day environment
#   make dev ENV=demo       # demo — isolated, curated, reseed before presenting
#
# Every target below is ENV-aware because COMPOSE/COMPOSE_DEV already are.

ENV      ?= staging
ENV_FILE := .env.$(ENV)
PROJECT  := sagip-$(ENV)

COMPOSE     := docker compose -p $(PROJECT) --env-file $(ENV_FILE) -f infra/compose.yml
COMPOSE_DEV := $(COMPOSE) -f infra/compose.override.yml
PY          := python

.DEFAULT_GOAL := help
.PHONY: help env dev up down restart logs ps migrate revision seed shell-api shell-db \
        test test-api test-web lint lint-api lint-web format types shadcn hazard \
        backup restore clean

help:  ## show this help
	@$(PY) tools/make_help.py

# --- environment ------------------------------------------------------------

env:  ## create .env.$(ENV) from .env.$(ENV).example if it does not exist yet (ENV=staging|demo)
	@$(PY) -c "import os,shutil; src='.env.$(ENV).example'; dst='.env.$(ENV)'; shutil.copy(src, dst) if not os.path.exists(dst) else None; print(dst+' ready')"

# --- running the stack ------------------------------------------------------

dev: env  ## start the stack with hot reload (ENV=staging|demo, default staging)
	@$(PY) tools/print_urls.py $(ENV_FILE) $(ENV)
	$(COMPOSE_DEV) up --build

up: env  ## start the stack detached, production-shaped (no hot reload)
	$(COMPOSE) up -d --build

down:  ## stop the stack, keep volumes
	$(COMPOSE_DEV) down

restart:  ## restart the stack
	$(COMPOSE_DEV) restart

logs:  ## tail logs from every service
	$(COMPOSE_DEV) logs -f --tail=100

ps:  ## show container status
	$(COMPOSE_DEV) ps

# --- database ---------------------------------------------------------------

migrate:  ## apply all pending migrations
	$(COMPOSE_DEV) run --rm api alembic upgrade head

revision:  ## autogenerate a migration:  make revision m="add household"
	$(COMPOSE_DEV) run --rm api alembic revision --autogenerate -m "$(m)"

seed:  ## load seed data (schema.md Section 15) — runs automatically on container start; this is only for a manual re-run
	$(COMPOSE_DEV) run --rm api python -m src.seed

shell-api:  ## shell into the api container
	$(COMPOSE_DEV) run --rm api bash

shell-db:  ## psql into the database
	$(COMPOSE_DEV) exec db psql -U app -d appdb

# --- quality gates ----------------------------------------------------------

test: test-api test-web  ## run api and web test suites

test-api:
	$(COMPOSE_DEV) run --rm api pytest -q

test-web:
	npm run test --workspace=apps/web --if-present

lint: lint-api lint-web  ## lint everything

lint-api:
	$(COMPOSE_DEV) run --rm api ruff check .

lint-web:
	npm run lint --workspace=apps/web
	npm run format:check --workspace=apps/web
	npm run typecheck --workspace=apps/web

format:  ## autoformat python and typescript
	$(COMPOSE_DEV) run --rm api ruff format .
	npm run format --workspace=apps/web --if-present

# --- generated artifacts ----------------------------------------------------

types:  ## regenerate the API client types from OpenAPI
	# -T disables the TTY; without it the container injects control characters
	# into the redirect and the JSON is unparseable.
	$(COMPOSE_DEV) run --rm -T api python -m src.main --export-openapi > packages/api-types/openapi.json
	npx openapi-typescript packages/api-types/openapi.json -o packages/api-types/src/generated.ts

shadcn:  ## (re)install every shadcn primitive listed in design.md Section 7.1
	@$(PY) tools/install_shadcn.py

hazard:  ## rebuild dataset/derived/ from dataset/raw/, then copy into the web app
	$(PY) tools/prepare_hazard.py
	@$(PY) -c "import glob,os,shutil; d='apps/web/public/data'; os.makedirs(d,exist_ok=True); [shutil.copy(f,d) for f in glob.glob('dataset/derived/*.geojson')]; print('copied to '+d)"

# --- operations ---------------------------------------------------------------

backup:  ## dump the database to infra/backups/ (needs bash; Git for Windows provides it). ENV=staging|demo
	ENV=$(ENV) bash infra/scripts/backup.sh

restore:  ## restore a dump — DESTRUCTIVE, asks for confirmation. ENV=staging|demo
	ENV=$(ENV) bash infra/scripts/restore.sh $(f)

clean:  ## stop the stack and delete volumes — wipes the database for ENV (default staging)
	$(COMPOSE_DEV) down -v
