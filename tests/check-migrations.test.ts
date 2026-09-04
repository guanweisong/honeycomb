import { describe, expect, it } from "vitest";

import { findMigrationGovernanceErrors } from "../scripts/check-migrations";

describe("migration governance checker", () => {
  it("rejects journal entries whose SQL file is missing", () => {
    expect(
      findMigrationGovernanceErrors({
        journalTags: ["0000_production_baseline"],
        migrationFiles: [],
        trackedFiles: [],
        changedFiles: [],
      }),
    ).toContain(
      "Journal entry 0000_production_baseline has no matching migration SQL",
    );
  });

  it("rejects a schema-only change", () => {
    expect(
      findMigrationGovernanceErrors({
        journalTags: ["0000_production_baseline"],
        migrationFiles: ["drizzle/0000_production_baseline.sql"],
        trackedFiles: [
          "drizzle/0000_production_baseline.sql",
          "drizzle/meta/_journal.json",
        ],
        changedFiles: ["src/packages/infrastructure/db/schema/content.ts"],
      }),
    ).toContain("Database schema changed without a matching drizzle/ change");
  });
});
