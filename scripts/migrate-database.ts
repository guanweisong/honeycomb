import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles, type MigrationMeta } from "drizzle-orm/migrator";
import { findPersistenceInvariantViolations } from "./audit-persistence-invariants";

type MigrationClient = ReturnType<typeof createClient>;

async function assertMigrationLedger(
  client: MigrationClient,
  expected: MigrationMeta[],
): Promise<number> {
  const { rows: tables } = await client.execute(
    "select name from sqlite_master where type = 'table' and name = '__drizzle_migrations'",
  );
  if (tables.length === 0) return 0;

  const { rows } = await client.execute(
    'select hash, created_at from "__drizzle_migrations" order by created_at',
  );
  for (const [index, row] of rows.entries()) {
    const migration = expected[index];
    if (
      !migration ||
      Number(row.created_at) !== migration.folderMillis ||
      row.hash !== migration.hash
    ) {
      throw new Error(`Migration ledger differs at entry ${index + 1}`);
    }
  }
  return rows.length;
}

async function applyReviewedMigrations(client: MigrationClient) {
  const config = { migrationsFolder: "drizzle" };
  const expected = readMigrationFiles(config);
  for (const [index, { folderMillis }] of expected.entries()) {
    if (
      !Number.isSafeInteger(folderMillis) ||
      folderMillis <= (expected[index - 1]?.folderMillis ?? 0)
    ) {
      throw new Error(
        `Migration timestamps must strictly increase at entry ${index + 1}`,
      );
    }
  }
  await assertMigrationLedger(client, expected);
  await migrate(drizzle(client), config);
  if ((await assertMigrationLedger(client, expected)) !== expected.length) {
    throw new Error("Migration ledger is incomplete after applying migrations");
  }
}

export async function migrateDatabase(
  client: MigrationClient,
  applyMigrations: () => Promise<void> = () => applyReviewedMigrations(client),
) {
  const violations = await findPersistenceInvariantViolations(client);
  if (violations.length > 0) {
    const summary = violations
      .map(({ table, field, count }) => `${table}.${field}: ${count}`)
      .join(", ");
    throw new Error(`Persistence invariant audit failed: ${summary}`);
  }
  await applyMigrations();
}

if (import.meta.main) {
  const url = process.env.TURSO_URL;
  if (!url) throw new Error("TURSO_URL is required");
  const client = createClient({ url, authToken: process.env.TURSO_TOKEN });
  try {
    await migrateDatabase(client);
    process.stdout.write("Database migrations applied successfully.\n");
  } finally {
    client.close();
  }
}
