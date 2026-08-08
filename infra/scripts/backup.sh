#!/usr/bin/env bash
# Dump the database to infra/backups/ (NFR-AVL-005).
#
# A VPS with no backup is one failed disk away from losing the whole demo. Copy
# the dump OFF the box — a backup on the same disk is not a backup.
#
# ENV selects the profile (staging|demo, default staging) — each is its own
# Compose project with its own database (architecture.md Section 13.1), so the
# dump filename is prefixed with the profile to keep the two apart in
# infra/backups/.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PROFILE="${ENV:-staging}"
ENV_FILE=".env.${PROFILE}"

# shellcheck disable=SC1091
[ -f "$ENV_FILE" ] && set -a && . "./$ENV_FILE" && set +a

DB_USER="${POSTGRES_USER:-app}"
DB_NAME="${POSTGRES_DB:-appdb}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="/backups/${PROFILE}_${DB_NAME}_${STAMP}.dump"

echo "Dumping ${PROFILE}/${DB_NAME} -> infra/backups/${PROFILE}_${DB_NAME}_${STAMP}.dump"
docker compose -p "sagip-${PROFILE}" --env-file "$ENV_FILE" -f infra/compose.yml exec -T db \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f "$OUT"

# Keep the last 14 dumps per profile; older ones are noise on a small VPS disk.
find infra/backups -name "${PROFILE}_${DB_NAME}_*.dump" -type f | sort -r | tail -n +15 | xargs -r rm --

echo "Done. Copy it off this machine before you consider it a backup."
