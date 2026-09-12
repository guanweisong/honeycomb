import { describe, expect, it } from "vitest";
import { createClient } from "@libsql/client/node";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  findMigrationGovernanceErrors,
  findSchemaStructureErrors,
  findSnapshotTableErrors,
  terminateChildWithEscalation,
  waitForMigrationChild,
} from "../scripts/check-migrations";
import {
  inspectSchema,
  type SchemaInventory,
} from "../scripts/audit-production-schema";

describe("migration governance checker", () => {
  it("rejects an index present only in the current Drizzle schema", () => {
    const replay: SchemaInventory = {
      tables: [{
        name: "post",
        sql: "CREATE TABLE `post` (`id` text PRIMARY KEY NOT NULL)",
        columns: [{ cid: 0, name: "id", type: "TEXT", notnull: 1, dfltValue: null, pk: 1 }],
        indexes: [],
        foreignKeys: [],
      }],
    };
    const replayTable = replay.tables[0];
    if (!replayTable) throw new Error("Expected replay table fixture");
    const current: SchemaInventory = {
      tables: [{
        ...replayTable,
        indexes: [{
          name: "post_status_idx",
          unique: 0,
          origin: "c",
          partial: 0,
          columns: [{ seqno: 0, name: "id", desc: 0, collation: "BINARY", key: 1 }],
          sql: "CREATE INDEX `post_status_idx` ON `post` (`id`)",
        }],
      }],
    };

    expect(findSchemaStructureErrors(replay, current)).toEqual([
      "Migration replay differs from current Drizzle schema for table post",
    ]);
  });

  it("rejects matching index names that target different columns", async () => {
    const directory = mkdtempSync(join(tmpdir(), "honeycomb-index-structure-"));
    const replay = createClient({ url: `file:${join(directory, "replay.db")}` });
    const current = createClient({ url: `file:${join(directory, "current.db")}` });
    try {
      for (const client of [replay, current]) {
        await client.execute("create table sample (a text, b text)");
      }
      await replay.execute("create index same_idx on sample (a)");
      await current.execute("create index same_idx on sample (b)");

      expect(
        findSchemaStructureErrors(
          await inspectSchema(replay),
          await inspectSchema(current),
        ),
      ).toEqual([
        "Migration replay differs from current Drizzle schema for table sample",
      ]);
    } finally {
      replay.close();
      current.close();
      rmSync(directory, { recursive: true });
    }
  });

  it("rejects a Snapshot CHECK whose expression differs", () => {
    const table = {
      name: "sample",
      sql: 'CREATE TABLE `sample` (`a` integer, CONSTRAINT "sample_a_check" CHECK("sample"."a" > 0))',
      columns: [],
      indexes: [],
      foreignKeys: [],
    };
    const snapshot = {
      columns: {},
      indexes: {},
      foreignKeys: {},
      checkConstraints: {
        sample_a_check: {
          name: "sample_a_check",
          value: '"sample"."a" > 1',
        },
      },
      compositePrimaryKeys: {},
    };

    expect(findSnapshotTableErrors(table, snapshot))
      .toContain("Migration replay check differs for sample.sample_a_check");
  });

  it("fails closed when the CI push base cannot be resolved", () => {
    const result = spawnSync("bun", ["scripts/check-migrations.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "true",
        GITHUB_EVENT_NAME: "push",
        QUALITY_DIFF_BASE_SHA: "ffffffffffffffffffffffffffffffffffffffff",
      },
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "Migration governance could not resolve push/PR base",
    );
  });

  it("force-stops a migration child that ignores the graceful signal", async () => {
    const child = spawn(
      process.execPath,
      [
        "-e",
        'process.on("SIGTERM", () => {}); process.stdout.write("ready\\n"); setInterval(() => {}, 1_000);',
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        child.stdout?.once("data", () => resolve());
        child.once("error", reject);
      });
      const startedAt = Date.now();

      await terminateChildWithEscalation(child, "SIGTERM", 25);

      expect(Date.now() - startedAt).toBeLessThan(1_000);
      expect(child.exitCode ?? child.signalCode).not.toBeNull();
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await new Promise<void>((resolve) => child.once("close", () => resolve()));
      }
    }
  });

  it("does not settle migration work on a child error after interruption", async () => {
    const child = spawn(
      process.execPath,
      ["-e", "setInterval(() => {}, 1_000);"],
      { stdio: "ignore" },
    );
    const waiting = waitForMigrationChild(child, () => "SIGTERM");
    try {
      child.emit("error", new Error("synthetic kill failure"));

      await expect(
        Promise.race([
          waiting.then(() => "resolved", () => "rejected"),
          new Promise<string>((resolve) => {
            setTimeout(() => resolve("pending"), 25);
          }),
        ]),
      ).resolves.toBe("pending");

      child.kill("SIGKILL");
      await expect(waiting).rejects.toThrow("Migration check interrupted by SIGTERM");
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await new Promise<void>((resolve) => child.once("close", () => resolve()));
      }
    }
  });

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
