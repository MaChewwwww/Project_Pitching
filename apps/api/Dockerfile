# syntax=docker/dockerfile:1

# --- base: runtime dependencies ---------------------------------------------
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    UV_LINK_MODE=copy

# libpq5 for psycopg, curl for the container healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.8.2 /uv /usr/local/bin/uv

WORKDIR /app

# Dependencies before source, so editing a module does not reinstall the world.
COPY pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# Migrations run on API start, not as a separate step — one less thing to forget
# (architecture.md Section 13.3). Seeding runs right after: src/seed.py checks
# each table's row count and skips anything already populated, so this is a
# no-op on every restart after the first and never duplicates data.
CMD ["sh", "-c", "alembic upgrade head && python -m src.seed && gunicorn src.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers ${GUNICORN_WORKERS:-2} \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile -"]

# --- dev: adds pytest and ruff ----------------------------------------------
# `make test` and `make lint` run inside this container, so the tools live here
# rather than requiring a local Python environment.
FROM base AS dev

RUN uv pip install --system --no-cache -r pyproject.toml --group dev

CMD ["sh", "-c", "alembic upgrade head && python -m src.seed && uvicorn src.main:app \
    --host 0.0.0.0 --port 8000 --reload --reload-dir /app/src"]
