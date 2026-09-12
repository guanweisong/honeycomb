import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createClient } from "@libsql/client/node";
import { inspectSchema } from "./audit-production-schema";

interface MigrationCheckInput {
  journalEntries: Array<{ idx: number; tag: string }>;
  migrationFiles: string[];
  snapshotFiles: string[];
  trackedFiles: string[];
  changedFiles: string[];
}

export function findMigrationGovernanceErrors({
  journalEntries,
  migrationFiles,
  snapshotFiles,
  trackedFiles,
  changedFiles,
}: MigrationCheckInput): string[] {
  const errors: string[] = [];
  const migrationNames = new Set(
    migrationFiles.map((file) => basename(file, ".sql")),
  );
  const journalTags = new Set(journalEntries.map(({ tag }) => tag));
  const journalIndexes = new Set(journalEntries.map(({ idx }) => idx));
  const snapshotIndexes = new Map(
    snapshotFiles.flatMap((file) => {
      const match = basename(file).match(/^(\d{4})_snapshot\.json$/);
      return match ? [[Number(match[1]), basename(file, ".json")]] : [];
    }),
  );

  for (const [position, { idx, tag }] of journalEntries.entries()) {
    if (!migrationNames.has(tag)) {
      errors.push(`Journal entry ${tag} has no matching migration SQL`);
    }
    if (!snapshotIndexes.has(idx)) {
      errors.push(`Journal entry ${tag} has no matching snapshot`);
    }
    if (idx !== position) {
      errors.push(`Journal index ${idx} is not contiguous; expected ${position}`);
    }
    const prefix = tag.match(/^(\d{4})_/)?.[1];
    if (prefix !== String(idx).padStart(4, "0")) {
      errors.push(`Journal entry ${tag} index prefix does not match idx ${idx}`);
    }
  }
  for (const name of migrationNames) {
    if (!journalTags.has(name)) {
      errors.push(`Migration SQL ${name} has no matching journal entry`);
    }
  }
  for (const [idx, name] of snapshotIndexes) {
    if (!journalIndexes.has(idx)) {
      errors.push(`Snapshot ${name} has no matching journal entry`);
    }
  }

  const tracked = new Set(trackedFiles);
  for (const file of [
    "drizzle/meta/_journal.json",
    ...migrationFiles,
    ...snapshotFiles,
  ]) {
    if (!tracked.has(file)) {
      errors.push(`${file} is not tracked by Git`);
    }
  }

  const schemaChanged = changedFiles.some((file) =>
    file.startsWith("src/packages/infrastructure/db/schema/"),
  );
  const migrationChanged = changedFiles.some((file) =>
    file.startsWith("drizzle/"),
  );
  if (schemaChanged && !migrationChanged) {
    errors.push("Database schema changed without a matching drizzle/ change");
  }

  return errors;
}

type SnapshotTable = {
  columns: Record<string, { name: string; type: string; notNull: boolean; primaryKey: boolean; default?: unknown }>;
  indexes: Record<string, { name: string; isUnique: boolean }>;
  foreignKeys: Record<string, { tableTo: string; columnsFrom: string[]; columnsTo: string[]; onDelete?: string; onUpdate?: string }>;
  checkConstraints: Record<string, { name: string }>;
  compositePrimaryKeys: Record<string, { columns: string[] }>;
};

async function replayStructureErrors(
  migrationFiles: string[],
  snapshotPath: string,
): Promise<string[]> {
  const directory = mkdtempSync(
    join(tmpdir(), `honeycomb-migration-check-${process.getuid?.() ?? "user"}-`),
  );
  const stat = lstatSync(directory);
  if (stat.isSymbolicLink() || (typeof process.getuid === "function" && stat.uid !== process.getuid())) {
    throw new Error(`Unsafe migration check directory: ${directory}`);
  }
  const client = createClient({ url: `file:${join(directory, "replay.db")}` });
  try {
    for (const file of [...migrationFiles].sort()) {
      await client.executeMultiple(readFileSync(file, "utf8"));
    }
    const actual = await inspectSchema(client);
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
      tables: Record<string, SnapshotTable>;
    };
    const errors: string[] = [];
    const actualByName = new Map(actual.tables.map((table) => [table.name, table]));
    const expectedNames = Object.keys(snapshot.tables).sort();
    const actualNames = actual.tables.map(({ name }) => name).sort();
    if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
      errors.push("Migration replay table inventory differs from latest snapshot");
    }
    for (const [name, expected] of Object.entries(snapshot.tables)) {
      const table = actualByName.get(name);
      if (!table) continue;
      const compositePrimaryKeyColumns = new Set(
        Object.values(expected.compositePrimaryKeys).flatMap(
          ({ columns }) => columns,
        ),
      );
      const expectedColumns = Object.values(expected.columns).map(
        ({ name, type, notNull, primaryKey, default: defaultValue }) =>
          `${name}:${type.toLowerCase()}:${Number(notNull)}:${Number(primaryKey || compositePrimaryKeyColumns.has(name))}:${defaultValue === undefined ? "" : String(defaultValue)}`,
      );
      const actualColumns = table.columns.map(
        ({ name, type, notnull, pk, dfltValue }) =>
          `${name}:${type.toLowerCase()}:${notnull}:${Number(pk > 0)}:${dfltValue ?? ""}`,
      );
      if (JSON.stringify(actualColumns) !== JSON.stringify(expectedColumns)) {
        errors.push(`Migration replay columns differ for ${name}`);
      }
      for (const [index, definition] of Object.entries(expected.indexes)) {
        if (!table.indexes.some(({ name, unique }) => name === index && Boolean(unique) === definition.isUnique)) {
          errors.push(`Migration replay is missing index ${name}.${index}`);
        }
      }
      for (const constraint of Object.keys(expected.checkConstraints)) {
        if (!table.sql.includes(constraint)) {
          errors.push(`Migration replay is missing check ${name}.${constraint}`);
        }
      }
      const expectedForeignKeys = Object.values(expected.foreignKeys).map((key) =>
        `${key.columnsFrom.join(",")}->${key.tableTo}.${key.columnsTo.join(",")}:${key.onUpdate ?? "no action"}:${key.onDelete ?? "no action"}`.toLowerCase(),
      ).sort();
      const actualForeignKeys = table.foreignKeys.map((key) =>
        `${key.from}->${key.table}.${key.to}:${key.onUpdate}:${key.onDelete}`.toLowerCase(),
      ).sort();
      if (JSON.stringify(actualForeignKeys) !== JSON.stringify(expectedForeignKeys)) {
        errors.push(`Migration replay foreign keys differ for ${name}`);
      }
    }
    return errors;
  } finally {
    client.close();
    rmSync(directory, { recursive: true });
    if (existsSync(directory)) throw new Error(`Migration check cleanup failed: ${directory}`);
  }
}

function gitLines(args: string[]): string[] {
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFiles(): string[] {
  const files = new Set([
    ...gitLines(["diff", "--name-only", "HEAD"]),
    ...gitLines(["diff", "--cached", "--name-only"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]);

  if (process.env.CI === "true") {
    const baseRef = process.env.GITHUB_BASE_REF;
    if (baseRef) {
      const mergeBase = gitLines(["merge-base", "HEAD", `origin/${baseRef}`])[0];
      if (mergeBase) {
        for (const file of gitLines(["diff", "--name-only", `${mergeBase}...HEAD`])) {
          files.add(file);
        }
      }
    } else {
      for (const file of gitLines(["diff", "--name-only", "HEAD^", "HEAD"])) {
        files.add(file);
      }
    }
  }

  return [...files];
}

async function main(): Promise<void> {
  const journalPath = "drizzle/meta/_journal.json";
  if (!existsSync(journalPath)) {
    throw new Error(`${journalPath} does not exist`);
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries?: Array<{ idx?: number; tag?: string }>;
  };
  const migrationFiles = readdirSync("drizzle")
    .filter((file) => file.endsWith(".sql"))
    .map((file) => join("drizzle", file));
  const snapshotFiles = readdirSync("drizzle/meta")
    .filter((file) => /^\d{4}_snapshot\.json$/.test(file))
    .map((file) => join("drizzle/meta", file));
  const errors = findMigrationGovernanceErrors({
    journalEntries: (journal.entries ?? []).flatMap(({ idx, tag }) =>
      idx === undefined || !tag ? [] : [{ idx, tag }],
    ),
    migrationFiles,
    snapshotFiles,
    trackedFiles: gitLines(["ls-files"]),
    changedFiles: changedFiles(),
  });

  if (errors.length > 0) {
    throw new Error(`Migration governance failed:\n- ${errors.join("\n- ")}`);
  }

  const latestSnapshot = [...snapshotFiles].sort().at(-1);
  if (!latestSnapshot) throw new Error("No migration snapshot exists");
  const replayErrors = await replayStructureErrors(migrationFiles, latestSnapshot);
  if (replayErrors.length > 0) {
    throw new Error(`Migration replay failed:\n- ${replayErrors.join("\n- ")}`);
  }

  process.stdout.write(
    `Migration governance passed (${migrationFiles.length} migration file).\n`,
  );
}

if (import.meta.main) {
  await main();
}
