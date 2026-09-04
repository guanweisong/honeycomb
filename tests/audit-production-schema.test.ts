import { describe, expect, it } from "vitest";

import {
  normalizeSchemaInventory,
  redactSensitiveText,
  type SchemaInventory,
} from "../scripts/audit-production-schema";

describe("production schema audit", () => {
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
          indexes: [{ name: "z_idx", unique: 0, origin: "c", partial: 0 }],
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
