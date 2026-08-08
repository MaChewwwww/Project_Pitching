# syntax=docker/dockerfile:1
#
# Build context is the **repository root**, not services/cron — see
# architecture.md Section 8.1. The external-data adapter contract
# (`apps/api/src/integrations/`) is authored once in `apps/api` and copied into
# this image as `integrations/`, so a fixed PAGASA parser is a change to one file
# that both containers end up running, never a hand-duplicated second copy.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    TZ=Asia/Manila \
    UV_LINK_MODE=copy

# libpq5 for psycopg; postgresql-client for pg_dump in the backup job.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.8.2 /uv /usr/local/bin/uv

WORKDIR /app

COPY services/cron/pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml

COPY services/cron/. .
COPY apps/api/src/integrations/ ./integrations/

# No EXPOSE, no ports. This container has no HTTP surface by design.
CMD ["python", "main.py"]
