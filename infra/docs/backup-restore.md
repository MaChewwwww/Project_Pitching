# Backup & restore

> **An untested backup is not a backup.** NFR-AVL-006 requires the restore path to be exercised
> at least once before the pitch. Not read — run.

A VPS with no verified backup is one failed disk away from losing the demo, the seeded data, and
the evening before the pitch.

## Taking one

```bash
make backup
```

Writes `infra/backups/appdb_<UTC timestamp>.dump` (custom format, compressed) and keeps the last
14. On Windows this needs `bash`, which Git for Windows provides.

**Then copy it off the machine.** A dump sitting on the same disk as the database it came from
is not a backup — it is a second copy of the thing that is about to fail. Anywhere else works:
your laptop, a teammate's, cloud storage.

`backup_database` in `services/cron` is the eventual automated version (daily 03:00). It is
currently a stub, so **for now this is manual** — put it in someone's calendar rather than
assuming it happens.

## Restoring

```bash
make restore              # newest dump
make restore f=appdb_20260807T031500Z.dump
```

**Destructive.** `--clean --if-exists` drops and recreates every object in the target database.
The script asks you to type the database name before proceeding; that prompt is the only thing
between a typo and an empty database.

## Rehearsing it — do this before the pitch

Do not rehearse against your working database. Restore into a throwaway one and compare.

```bash
# 1. take a dump of the real thing
make backup

# 2. create a scratch database
docker compose --env-file .env -f infra/compose.yml exec -T db \
  psql -U app -d postgres -c "CREATE DATABASE restore_test"

# 3. restore into it
docker compose --env-file .env -f infra/compose.yml exec -T db \
  pg_restore -U app -d restore_test /backups/<your-dump>

# 4. compare row counts against the real database
docker compose --env-file .env -f infra/compose.yml exec -T db \
  psql -U app -d restore_test -c "SELECT count(*) FROM household"

# 5. clean up
docker compose --env-file .env -f infra/compose.yml exec -T db \
  psql -U app -d postgres -c "DROP DATABASE restore_test"
```

If step 4 matches, the backup is real. Record the date you did it — that is the evidence
NFR-AVL-006 asks for.

## What a dump does and does not contain

| | In the dump? |
|---|---|
| Every table, row, index, constraint | Yes |
| PostGIS geometry — areas, household pins, hazard polygons | Yes |
| Alembic version | Yes, so a restore lands on a known migration |
| **Uploaded incident photos** | **No** — they live on the `uploads` volume |
| `.env` | No |

**Uploads are not covered.** Photos live on a Docker volume, not in Postgres, so a full recovery
needs both. To include them:

```bash
docker run --rm -v barangay-platform_uploads:/data -v "$PWD/infra/backups:/out" \
  alpine tar czf /out/uploads.tgz -C /data .
```

## Restoring onto an empty host

1. Clone the repo, create `.env`.
2. `make up` — this creates the schema by running migrations.
3. `make restore` — this replaces it with the dump's contents.

Step 2 before step 3 is not redundant: `pg_restore --clean` needs the database and the
extensions to exist before it can drop and recreate objects inside it.
