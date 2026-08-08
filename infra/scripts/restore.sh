#!/usr/bin/env bash
# Restore a dump produced by backup.sh.
#
# DESTRUCTIVE: --clean drops and recreates every object in the target database.
#
#   ./infra/scripts/restore.sh                       # newest dump for this profile
#   ./infra/scripts/restore.sh staging_appdb_20260807T031500Z.dump
#   ENV=demo ./infra/scripts/restore.sh              # newest demo dump
#
# NFR-AVL-006 requires this to be exercised at least once before the pitch. An
# untested backup is not a backup — run it against a throwaway database and
# confirm the row counts.
#
# ENV selects the profile (staging|demo, default staging) — each is its own
# Compose project with its own database (architecture.md Section 13.1).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PROFILE="${ENV:-staging}"
ENV_FILE=".env.${PROFILE}"

# shellcheck disable=SC1091
[ -f "$ENV_FILE" ] && set -a && . "./$ENV_FILE" && set +a

DB_USER="${POSTGRES_USER:-app}"
DB_NAME="${POSTGRES_DB:-appdb}"

FILE="${1:-}"
if [ -z "$FILE" ]; then
  FILE="$(find infra/backups -name "${PROFILE}_*.dump" -type f | sort -r | head -n 1 | xargs -r basename)"
fi

if [ -z "$FILE" ] || [ ! -f "infra/backups/$FILE" ]; then
  echo "No dump found for profile '${PROFILE}'. Looked in infra/backups/ for: ${FILE:-<any ${PROFILE}_*.dump>}" >&2
  exit 1
fi

echo "About to OVERWRITE database '${DB_NAME}' (profile: ${PROFILE}) from infra/backups/${FILE}"
read -r -p "Type the database name to confirm: " CONFIRM
[ "$CONFIRM" = "$DB_NAME" ] || { echo "Aborted."; exit 1; }

docker compose -p "sagip-${PROFILE}" --env-file "$ENV_FILE" -f infra/compose.yml exec -T db \
  pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists "/backups/${FILE}"

echo "Restored. Verify row counts before trusting it."
