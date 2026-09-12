import { describe, expect, it } from "vitest";
import { createClient } from "@libsql/client/node";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  inspectSchema,
  normalizeSchemaInventory,
  redactSensitiveText,
  type SchemaInventory,
} from "../scripts/audit-production-schema";

describe("production schema audit", () => {
  it("excludes only exact SQLite and Drizzle internal table prefixes", async () => {
    const directory = mkdtempSync(join(tmpdir(), "honeycomb-schema-filter-"));
    const client = createClient({ url: `file:${join(directory, "schema.db")}` });
    try {
      await client.execute("create table sqliteXbusiness (id text)");
      await client.execute("create table __drizzle_migrations (id text)");

      expect((await inspectSchema(client)).tables.map(({ name }) => name)).toEqual([
        "sqliteXbusiness",
      ]);
    } finally {
      client.close();
      rmSync(directory, { recursive: true });
    }
  });

  it("normalizes schema objects into a stable order", () => {
    const inventory: SchemaInventory = {
      tables: [
        {
          name: "z_table",
          sql: "CREATE TABLE z_table (id text)",
          columns: [{ cid: 0, name: "id", type: "TEXT", notnull: 0, dfltValue: null, pk: 0 }],
          indexes: [],
          foreignKeys: [],
        },
        {
          name: "a_table",
          sql: "CREATE TABLE a_table (id text)",
          columns: [],
          indexes: [{
            name: "z_idx",
            unique: 0,
            origin: "c",
            partial: 0,
            columns: [],
            sql: null,
          }],
          foreignKeys: [],
        },
      ],
    };

    expect(normalizeSchemaInventory(inventory).tables.map(({ name }) => name)).toEqual([
      "a_table",
      "z_table",
    ]);
  });

  it("redacts database URLs and tokens from report text", () => {
    expect(
      redactSensitiveText(
        "libsql://prod.example.turso.io token=secret-value authToken: another-secret",
      ),
    ).toBe("[REDACTED_DATABASE_URL] token=[REDACTED] authToken: [REDACTED]");
  });
});
