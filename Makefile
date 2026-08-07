# The single entry point for this repo (docs/architecture.md Section 12.3).
# Prefer these over ad-hoc commands so what you run locally matches what CI runs.
#
# Windows: install GNU Make once with  winget install ezwinports.make
# Recipes below stay portable between cmd.exe and sh — no cp, no rm, no &&-chained
# shell builtins. Anything filesystem-ish goes through python or docker.

COMPOSE     := docker compose --env-file .env -f infra/compose.yml
COMPOSE_DEV := $(COMPOSE) -f infra/compose.override.yml
PY          := python

.DEFAULT_GOAL := help
.PHONY: help env dev up down restart logs ps migrate revision seed shell-api shell-db \
        test test-api test-web lint lint-api lint-web format types shadcn hazard \
        backup restore clean

help:  ## show this help
	@$(PY) tools/make_help.py

# --- environment ------------------------------------------------------------

env:  ## create .env from .env.example if it does not exist yet
	@$(PY) -c "import os,shutil; shutil.copy('.env.example','.env') if not os.path.exists('.env') else None; print('.env ready')"

# --- running the stack ------------------------------------------------------

dev: env  ## start the whole stack with hot reload
	@$(PY) -c "print('  web   http://localhost:8080\n  api   http://localhost:8080/api/v1/health\n  docs  http://localhost:8080/api/docs\n')"
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

seed:  ## load seed data (schema.md Section 15)
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

# --- operations -------------------------------------------------------------

backup:  ## dump the database to infra/backups/ (needs bash; Git for Windows provides it)
	bash infra/scripts/backup.sh

restore:  ## restore a dump — DESTRUCTIVE, asks for confirmation
	bash infra/scripts/restore.sh $(f)

clean:  ## stop the stack and delete volumes — wipes the database
	$(COMPOSE_DEV) down -v
