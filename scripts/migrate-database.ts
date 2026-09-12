import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { findPersistenceInvariantViolations } from "./audit-persistence-invariants";

type MigrationClient = ReturnType<typeof createClient>;

export async function migrateDatabase(
  client: MigrationClient,
  applyMigrations: () => Promise<void> = () =>
    migrate(drizzle(client), { migrationsFolder: "drizzle" }),
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
