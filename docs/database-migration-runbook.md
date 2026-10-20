# Database Migration Runbook

## Rules

- `drizzle/0000_production_baseline.sql` initializes an empty database only.
- Production and shared databases use reviewed `db:migrate` migrations, never
  `drizzle-kit push`.
- Existing production must not run `db:migrate` until its Drizzle ledger has
  explicitly adopted the baseline.
- Any production write requires a verified backup, a maintenance window, and
  explicit approval immediately before execution.

## New environment

1. Create an empty LibSQL/Turso database.
2. Set `TURSO_URL` and `TURSO_TOKEN` for that new database.
3. Run `bun run db:migrate`.
4. Run `bun run db:schema:audit -- --local <database-url> --output <new-report-path>` and compare the
   inventory with the reviewed migration chain and current generated schema.
   `docs/production-schema-baseline-report.md` records the historical baseline,
   not the expected schema after subsequent migrations.
5. Start the application and run its smoke tests.

## Add a schema change

1. Modify `src/lib/db/schema/`.
2. Run `bun run db:generate` and review the generated SQL and snapshot.
3. Run `bun run db:migrations:check` and the test suite.
4. Apply the migration to a disposable database before deployment.
5. Back up the target shared database, then run `bun run db:migrate` during the
   approved release.

## Existing production baseline adoption

Status: **not executed — explicit approval required**.

Before adoption:

1. Create and verify a restorable production backup.
2. Re-run the read-only `bun run db:schema:audit -- --output <new-report-path>`
   without overwriting the historical baseline report. The command inventories
   the target only and explicitly reports `Not compared`; it cannot certify
   `No unresolved differences`. Separately compare the complete target schema
   with the reviewed baseline SQL/snapshot, resolve every discrepancy, and record
   that comparison before adoption. Do not rely on the historical report as a
   fresh equivalence check.
3. Verify the baseline file SHA-256 is
   `72a1c0df496985446b0beb5c5fa140d6b28316a6105dac1b13be2c84d0ab620a`.
4. Verify production does not already contain conflicting rows in
   `__drizzle_migrations`.

With fresh explicit approval, adopt the already-present production structure by
creating Drizzle's ledger and recording the baseline as applied, in one
transaction:

```sql
BEGIN;
CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at numeric
);
INSERT INTO "__drizzle_migrations" (hash, created_at)
SELECT
  '72a1c0df496985446b0beb5c5fa140d6b28316a6105dac1b13be2c84d0ab620a',
  1788533434184
WHERE NOT EXISTS (
  SELECT 1 FROM "__drizzle_migrations" WHERE created_at = 1788533434184
);
COMMIT;
```

Immediately query the ledger and re-run the schema audit. Do not execute the
baseline DDL against existing production tables.

## Rollback

- If ledger adoption fails before commit, roll back the transaction and make no
  application deployment.
- If a later migration fails, stop the release, preserve logs, and restore the
  verified backup. Drizzle migrations are forward SQL; do not improvise reverse
  DDL against production.
- Re-run the read-only audit after restoration and compare it with the last
  approved report before resuming traffic.

## Versioned editing and media release: 0004–0007

These migrations have local disposable-database evidence, not approval to run
against production:

- `0004_post_editor_revision.sql`: post revision and resource-associated creation
  token/hash.
- `0005_page_editor_revision.sql`: corresponding Page fields, preserving bilingual
  data and existing identifiers.
- `0006_site_snapshot_versions.sql`: settings revision and menu singleton revision.
- `0007_media_lifecycle.sql`: media recovery fields, historical READY backfill with
  no claim of historical byte verification, future UPLOADING default.

Before release, verify the target's actual ledger and schema; do not assume the
baseline-adoption procedure above has already happened. Rehearse the whole
pending chain on an isolated copy with no live external credentials, verify data
and foreign keys, and verify a restorable backup before requesting production
execution approval.

Plan a write pause and coordinated server/client cutover. Old writers do not
maintain these revision and lifecycle invariants; missing expected versions are
rejected, not silently filled. A schema addition alone is not a safe mixed-writer
compatibility period. Refresh old clients and follow the one-hour historical
upload credential window in [the media runbook](media-storage-runbook.md).

Rollback requires a write pause or a reviewed compatibility patch. Do not restore
an old writable application against the new invariants, and do not claim a
database backup can recover already deleted storage objects. Actual R2/runtime
and cross-layer cache validation remain release gates documented in the media
and [public cache](public-cache-verification.md) runbooks.
