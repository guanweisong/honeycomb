import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createClient, type Client } from "@libsql/client/node";
import {
  inspectSchema,
  type SchemaInventory,
  type SchemaTable,
} from "./audit-production-schema";

interface MigrationCheckInput {
  journalEntries: Array<{ idx: number; tag: string }>;
  migrationFiles: string[];
  snapshotFiles: string[];
  trackedFiles: string[];
}

export function findMigrationGovernanceErrors({
  journalEntries,
  migrationFiles,
  snapshotFiles,
  trackedFiles,
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

  return errors;
}

type SnapshotTable = {
  columns: Record<string, { name: string; type: string; notNull: boolean; primaryKey: boolean; default?: unknown }>;
  indexes: Record<string, { name: string; columns: string[]; isUnique: boolean }>;
  foreignKeys: Record<string, { tableTo: string; columnsFrom: string[]; columnsTo: string[]; onDelete?: string; onUpdate?: string }>;
  checkConstraints: Record<string, { name: string; value: string }>;
  compositePrimaryKeys: Record<string, { columns: string[] }>;
};

const handledSignals = ["SIGHUP", "SIGINT", "SIGTERM"] as const;
type HandledSignal = (typeof handledSignals)[number];
const signalExitCodes: Record<HandledSignal, number> = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};

class MigrationCheckSignal extends Error {
  constructor(readonly signal: HandledSignal) {
    super(`Migration check interrupted by ${signal}`);
  }
}

export async function terminateChildWithEscalation(
  child: ChildProcess,
  signal: NodeJS.Signals,
  graceMs = 2_000,
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;

  await new Promise<void>((resolve, reject) => {
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanupListeners = () => {
      if (escalationTimer) clearTimeout(escalationTimer);
      if (deadlineTimer) clearTimeout(deadlineTimer);
      child.removeListener("close", handleClose);
      child.removeListener("error", handleError);
    };
    const handleClose = () => {
      cleanupListeners();
      resolve();
    };
    const handleError = (error: Error) => {
      cleanupListeners();
      reject(error);
    };

    child.once("close", handleClose);
    child.once("error", handleError);
    const escalationTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
      deadlineTimer = setTimeout(() => {
        cleanupListeners();
        reject(new Error("Migration child did not exit after SIGKILL"));
      }, Math.max(graceMs, 100));
    }, graceMs);
    child.kill(signal);
  });
}

export async function waitForMigrationChild(
  child: ChildProcess,
  receivedSignal: () => HandledSignal | undefined,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanupListeners = () => {
      child.removeListener("error", handleError);
      child.removeListener("close", handleClose);
    };
    const handleError = (error: Error) => {
      if (receivedSignal()) return;
      cleanupListeners();
      reject(error);
    };
    const handleClose = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanupListeners();
      const interrupted = receivedSignal();
      if (interrupted) reject(new MigrationCheckSignal(interrupted));
      else if (code === 0) resolve();
      else reject(new Error(`Drizzle schema generation failed (${signal ?? code})`));
    };

    child.once("error", handleError);
    child.once("close", handleClose);
  });
}

function normalizeSql(value: string): string {
  return value.replaceAll("`", '"').replace(/\s+/gu, " ").trim();
}

function normalizedTable(table: SchemaTable) {
  return {
    ...table,
    sql: table.sql
      .replace(/^CREATE TABLE\s+[`"](?:[^`"]+)[`"]\s*/iu, "CREATE TABLE ")
      .replaceAll("`", '"')
      .replace(/\s+/gu, " ")
      .trim(),
    indexes: table.indexes.map((index) => ({
      ...index,
      sql: index.sql ? normalizeSql(index.sql) : null,
    })),
  };
}

export function findSnapshotTableErrors(
  table: SchemaTable,
  expected: SnapshotTable,
): string[] {
  const errors: string[] = [];
  const expectedIndexes = Object.values(expected.indexes)
    .map(({ name, columns, isUnique }) =>
      `${name}:${Number(isUnique)}:${columns.join(",")}`,
    )
    .sort();
  const actualIndexes = table.indexes
    .filter(({ origin }) => origin === "c")
    .map(({ name, unique, columns }) =>
      `${name}:${unique}:${columns.filter(({ key }) => key === 1).map(({ name: column }) => column ?? "<expression>").join(",")}`,
    )
    .sort();
  if (JSON.stringify(actualIndexes) !== JSON.stringify(expectedIndexes)) {
    errors.push(`Migration replay indexes differ for ${table.name}`);
  }

  const tableSql = normalizeSql(table.sql);
  for (const { name, value } of Object.values(expected.checkConstraints)) {
    const expectedConstraint = normalizeSql(
      `CONSTRAINT "${name}" CHECK(${value})`,
    );
    if (!tableSql.includes(expectedConstraint)) {
      errors.push(`Migration replay check differs for ${table.name}.${name}`);
    }
  }
  const expectedChecks = Object.keys(expected.checkConstraints).sort();
  const actualChecks = [...table.sql.matchAll(/CONSTRAINT\s+[`"]([^`"]+)[`"]\s+CHECK/giu)]
    .map((match) => match[1])
    .sort();
  if (JSON.stringify(actualChecks) !== JSON.stringify(expectedChecks)) {
    errors.push(`Migration replay checks differ for ${table.name}`);
  }

  return errors;
}

export function findSchemaStructureErrors(
  replay: SchemaInventory,
  current: SchemaInventory,
): string[] {
  const replayByName = new Map(replay.tables.map((table) => [table.name, table]));
  const currentByName = new Map(current.tables.map((table) => [table.name, table]));
  const names = new Set([...replayByName.keys(), ...currentByName.keys()]);

  return [...names].sort().flatMap((name) => {
    const replayTable = replayByName.get(name);
    const currentTable = currentByName.get(name);
    return replayTable &&
      currentTable &&
      JSON.stringify(normalizedTable(replayTable)) ===
        JSON.stringify(normalizedTable(currentTable))
      ? []
      : [`Migration replay differs from current Drizzle schema for table ${name}`];
  });
}

async function replayStructureErrors(
  migrationFiles: string[],
  snapshotPath: string,
): Promise<string[]> {
  const directory = mkdtempSync(
    join(tmpdir(), `honeycomb-migration-check-${process.getuid?.() ?? "user"}-`),
  );
  const sentinel = join(directory, ".honeycomb-test-db");
  try {
    writeFileSync(sentinel, "honeycomb-test-db:migration-check\n", { mode: 0o600 });
  } catch (error) {
    rmSync(directory, { recursive: true });
    throw error;
  }
  const replayUrl = `file:${join(directory, "replay.db")}`;
  const currentSchemaUrl = `file:${join(directory, "current-schema.db")}`;
  const clients: Client[] = [];
  let activeChild: ChildProcess | undefined;
  let receivedSignal: HandledSignal | undefined;
  let clientsClosed = false;
  let cleaned = false;
  const closeClients = () => {
    if (clientsClosed) return;
    clientsClosed = true;
    for (const openClient of clients) openClient.close();
  };
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    closeClients();
    const currentStat = lstatSync(directory, { throwIfNoEntry: false });
    if (
      !currentStat ||
      currentStat.isSymbolicLink() ||
      (typeof process.getuid === "function" && currentStat.uid !== process.getuid()) ||
      readFileSync(sentinel, "utf8") !== "honeycomb-test-db:migration-check\n"
    ) {
      throw new Error(`Unsafe migration check cleanup target: ${directory}`);
    }
    rmSync(directory, { recursive: true });
    if (existsSync(directory)) throw new Error(`Migration check cleanup failed: ${directory}`);
  };
  const signalHandlers = new Map<HandledSignal, () => void>(
    handledSignals.map((signal) => [
      signal,
      () => {
        if (receivedSignal) return;
        receivedSignal = signal;
        if (activeChild && activeChild.exitCode === null) {
          const childPid = activeChild.pid;
          void terminateChildWithEscalation(activeChild, signal).catch((error) => {
            closeClients();
            process.stderr.write(
              `Migration child ${childPid ?? "unknown"} did not exit; preserving ${directory}: ${error instanceof Error ? error.message : String(error)}\n`,
            );
            process.exit(signalExitCodes[signal]);
          });
          return;
        }
        cleanup();
        process.exit(signalExitCodes[signal]);
      },
    ]),
  );
  for (const [signal, handler] of signalHandlers) process.once(signal, handler);
  try {
    const stat = lstatSync(directory);
    if (
      stat.isSymbolicLink() ||
      (typeof process.getuid === "function" && stat.uid !== process.getuid())
    ) {
      throw new Error(`Unsafe migration check directory: ${directory}`);
    }
    const replayClient = createClient({ url: replayUrl });
    clients.push(replayClient);
    for (const file of [...migrationFiles].sort()) {
      await replayClient.executeMultiple(readFileSync(file, "utf8"));
    }
    const actual = await inspectSchema(replayClient);
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
      errors.push(...findSnapshotTableErrors(table, expected));
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
    try {
      const drizzleCli = join(
        process.cwd(),
        "node_modules",
        "drizzle-kit",
        "bin.cjs",
      );
      activeChild = spawn(
        process.execPath,
        [
          drizzleCli,
          "push",
          "--dialect",
          "sqlite",
          "--schema",
          "./src/packages/infrastructure/db/schema/index.ts",
          "--url",
          currentSchemaUrl,
          "--force",
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            TURSO_URL: currentSchemaUrl,
            TURSO_TOKEN: "local-migration-check",
          },
          stdio: "ignore",
        },
      );
      await waitForMigrationChild(activeChild, () => receivedSignal);
    } finally {
      activeChild = undefined;
    }
    const currentClient = createClient({ url: currentSchemaUrl });
    clients.push(currentClient);
    const currentSchema = await inspectSchema(currentClient);
    errors.push(...findSchemaStructureErrors(actual, currentSchema));
    return errors;
  } finally {
    for (const [signal, handler] of signalHandlers) {
      process.removeListener(signal, handler);
    }
    cleanup();
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
  try {
    await main();
  } catch (error) {
    if (error instanceof MigrationCheckSignal) {
      process.exit(signalExitCodes[error.signal]);
    }
    throw error;
  }
}
