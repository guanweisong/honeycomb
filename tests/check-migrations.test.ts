import { describe, expect, it } from "vitest";

import { findMigrationGovernanceErrors } from "../scripts/check-migrations";

describe("migration governance checker", () => {
  it("rejects journal entries whose SQL file is missing", () => {
    expect(
      findMigrationGovernanceErrors({
        journalEntries: [{ idx: 0, tag: "0000_production_baseline" }],
        migrationFiles: [],
        snapshotFiles: [],
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
        journalEntries: [{ idx: 0, tag: "0000_production_baseline" }],
        migrationFiles: ["drizzle/0000_production_baseline.sql"],
        snapshotFiles: ["drizzle/meta/0000_snapshot.json"],
        trackedFiles: [
          "drizzle/0000_production_baseline.sql",
          "drizzle/meta/_journal.json",
        ],
        changedFiles: ["src/packages/infrastructure/db/schema/content.ts"],
      }),
    ).toContain("Database schema changed without a matching drizzle/ change");
  });

  it("rejects SQL and snapshots that are not represented in the journal", () => {
    const errors = findMigrationGovernanceErrors({
      journalEntries: [{ idx: 0, tag: "0000_production_baseline" }],
      migrationFiles: [
        "drizzle/0000_production_baseline.sql",
        "drizzle/0001_extra.sql",
      ],
      snapshotFiles: [
        "drizzle/meta/0000_snapshot.json",
        "drizzle/meta/0001_snapshot.json",
      ],
      trackedFiles: [],
      changedFiles: [],
    });
    expect(errors).toContain("Migration SQL 0001_extra has no matching journal entry");
    expect(errors).toContain("Snapshot 0001_snapshot has no matching journal entry");
  });

  it("rejects missing snapshots and non-contiguous or mismatched indexes", () => {
    const errors = findMigrationGovernanceErrors({
      journalEntries: [
        { idx: 0, tag: "0000_production_baseline" },
        { idx: 2, tag: "0001_wrong_index" },
      ],
      migrationFiles: [
        "drizzle/0000_production_baseline.sql",
        "drizzle/0001_wrong_index.sql",
      ],
      snapshotFiles: ["drizzle/meta/0000_snapshot.json"],
      trackedFiles: [],
      changedFiles: [],
    });
    expect(errors).toContain("Journal index 2 is not contiguous; expected 1");
    expect(errors).toContain("Journal entry 0001_wrong_index index prefix does not match idx 2");
    expect(errors).toContain("Journal entry 0001_wrong_index has no matching snapshot");
  });
});
