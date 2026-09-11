import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.TURSO_URL;
if (!url) throw new Error("TURSO_URL is required");

const client = createClient({ url, authToken: process.env.TURSO_TOKEN });

try {
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  process.stdout.write("Database migrations applied successfully.\n");
} finally {
  client.close();
}
