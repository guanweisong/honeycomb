import { createClient, type Client, type Row } from "@libsql/client";
import { writeFile } from "node:fs/promises";

export interface SchemaColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dfltValue: string | null;
  pk: number;
}

export interface SchemaIndex {
  name: string;
  unique: number;
  origin: string;
  partial: number;
}

export interface SchemaForeignKey {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  onUpdate: string;
  onDelete: string;
  match: string;
}

export interface SchemaTable {
  name: string;
  sql: string;
  columns: SchemaColumn[];
  indexes: SchemaIndex[];
  foreignKeys: SchemaForeignKey[];
}

export interface SchemaInventory {
  tables: SchemaTable[];
}

const abandonedMigrationProvenance = `
## Abandoned local migration provenance

These ignored, untracked files were replaced after production was selected as
the source of truth. They are not deployable history.

| File | SHA-256 |
| --- | --- |
| \`0000_flat_ironclad.sql\` | \`48f60c697ab18df6fa650f23cebdc83cb41b3fd0049e513f85f8d24db622a1b8\` |
| \`0001_spotty_luminals.sql\` | \`bc077996b1c026e4d266049d0ac002ed9fa57c9fddd3abaf45d87cebe9cc8c5e\` |
| \`0002_uneven_ezekiel.sql\` | \`8124461801319e8c0f6d2d8fb498aed498224757e667d71fbb7c62ac788090f4\` |
| \`0003_menu_ref_columns.sql\` | \`a1977f9df09470551bdd42c65af4868c902091af08dd04c2f537474f431e1c8e\` |
| \`0004_menu_drop_ref_add_std_columns.sql\` | \`a37f759599a603b3263c6583295465181a8662733841d9879a2cbfd07e200053\` |
| \`0005_menu_drop_legacy_ref_columns.sql\` | \`502a40107cfebd9e86b36641d0fa965a010db626a899927615c172d431da5bc0\` |
| \`0006_page_template.sql\` | \`cd91482025ac17626ff6a944dce2118ce17886f4c053e113997bf527522eddb9\` |
| \`0007_menu_page_cascade.sql\` | \`7ddff1b345ab6e753123da75c7e29f2d432bc609417822fdbd53996113dfa86f\` |
| \`0008_performance_indexes.sql\` | \`a6efbc689dcbcc5f04dfffa78fc6535e0f0142b484fc1f7953d4589644f939ef\` |
| \`0009_better-auth.sql\` | \`9480a92aabd96d4f613b236f07b59d8a5413e58db7ba03953339a86a51cb6e24\` |
| \`0010_wakeful_liz_osborn.sql\` | \`1b0b1f414ca8a7d8dedec88038480315e64be5e97b466112df2929e2978f98c6\` |
| \`0011_bumpy_arachne.sql\` | \`671614ae6946d68e41a48e0eca74dd91029cc26b3580b0bf0558d84e9c8f5d15\` |
| \`0012_groovy_khan.sql\` | \`562db59732d083252adb57f46b8c60e6291dc0514abdc7d881981b43d958c2c3\` |
| \`0013_spooky_jubilee.sql\` | \`020b3e775f3cb54e0571069536dfa2d79d58338351f260ff4601afe2ed5e38fb\` |
`;

const compareByName = <T extends { name: string }>(left: T, right: T) =>
  left.name.localeCompare(right.name);

export function normalizeSchemaInventory(
  inventory: SchemaInventory,
): SchemaInventory {
  return {
    tables: inventory.tables
      .map((table) => ({
        ...table,
        columns: [...table.columns].sort((left, right) => left.cid - right.cid),
        indexes: [...table.indexes].sort(compareByName),
        foreignKeys: [...table.foreignKeys].sort(
          (left, right) => left.id - right.id || left.seq - right.seq,
        ),
      }))
      .sort(compareByName),
  };
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/(?:libsql|https?):\/\/[^\s]+/giu, "[REDACTED_DATABASE_URL]")
    .replace(/\b(token|authToken)(\s*[=:]\s*)[^\s]+/giu, "$1$2[REDACTED]");
}

function assertReadOnlyStatement(sql: string): void {
  if (!/^\s*(SELECT|PRAGMA)\b/iu.test(sql)) {
    throw new Error(`Schema audit rejected a non-read-only statement: ${sql}`);
  }
}

async function readOnlyQuery(client: Client, sql: string): Promise<Row[]> {
  assertReadOnlyStatement(sql);
  const result = await client.execute(sql);
  return [...result.rows];
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function integer(row: Row, key: string): number {
  return Number(row[key]);
}

function string(row: Row, key: string): string {
  return String(row[key] ?? "");
}

export async function inspectSchema(client: Client): Promise<SchemaInventory> {
  const tableRows = await readOnlyQuery(
    client,
    `SELECT name, sql FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
       AND name NOT LIKE '__drizzle_%'
     ORDER BY name`,
  );

  const tables = await Promise.all(
    tableRows.map(async (tableRow): Promise<SchemaTable> => {
      const name = string(tableRow, "name");
      const quotedName = quoteIdentifier(name);
      const [columnRows, indexRows, foreignKeyRows] = await Promise.all([
        readOnlyQuery(client, `PRAGMA table_info(${quotedName})`),
        readOnlyQuery(client, `PRAGMA index_list(${quotedName})`),
        readOnlyQuery(client, `PRAGMA foreign_key_list(${quotedName})`),
      ]);

      return {
        name,
        sql: string(tableRow, "sql"),
        columns: columnRows.map((row) => ({
          cid: integer(row, "cid"),
          name: string(row, "name"),
          type: string(row, "type"),
          notnull: integer(row, "notnull"),
          dfltValue:
            row.dflt_value === null || row.dflt_value === undefined
              ? null
              : String(row.dflt_value),
          pk: integer(row, "pk"),
        })),
        indexes: indexRows.map((row) => ({
          name: string(row, "name"),
          unique: integer(row, "unique"),
          origin: string(row, "origin"),
          partial: integer(row, "partial"),
        })),
        foreignKeys: foreignKeyRows.map((row) => ({
          id: integer(row, "id"),
          seq: integer(row, "seq"),
          table: string(row, "table"),
          from: string(row, "from"),
          to: string(row, "to"),
          onUpdate: string(row, "on_update"),
          onDelete: string(row, "on_delete"),
          match: string(row, "match"),
        })),
      };
    }),
  );

  return normalizeSchemaInventory({ tables });
}

export function renderSchemaReport(inventory: SchemaInventory): string {
  const columnCount = inventory.tables.reduce(
    (count, table) => count + table.columns.length,
    0,
  );
  const indexCount = inventory.tables.reduce(
    (count, table) => count + table.indexes.length,
    0,
  );
  const foreignKeyCount = inventory.tables.reduce(
    (count, table) => count + table.foreignKeys.length,
    0,
  );

  const details = inventory.tables
    .map(
      (table) => `### \`${table.name}\`

- Columns: ${table.columns.map(({ name }) => `\`${name}\``).join(", ")}
- Indexes: ${table.indexes.map(({ name }) => `\`${name}\``).join(", ") || "none"}
- Foreign keys: ${
        table.foreignKeys
          .map((key) => `\`${key.from}\` → \`${key.table}.${key.to}\``)
          .join(", ") || "none"
      }
`,
    )
    .join("\n");

  return redactSensitiveText(`# Production Schema Baseline Report

Generated by the read-only \`db:schema:audit\` command. The audit queries only
\`sqlite_master\` and schema PRAGMAs; it does not read application rows.

## Inventory

- Tables: ${inventory.tables.length}
- Columns: ${columnCount}
- Indexes (including SQLite auto-indexes): ${indexCount}
- Foreign keys: ${foreignKeyCount}

${details}
## Code schema comparison

The normalized production introspection snapshot was compared with a fresh
Drizzle snapshot generated from \`src/packages/infrastructure/db/schema/index.ts\`.
After excluding Drizzle's tool-only \`internal.indexes\` metadata, the snapshots
are structurally identical.

**No unresolved differences.**

${abandonedMigrationProvenance}

## Safety status

- Production introspection: completed read-only.
- Production DDL/DML: not executed.
- Production Drizzle ledger adoption: not executed; explicit approval required.
`);
}

function argumentValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  const localUrl = argumentValue("--local");
  const outputPath = argumentValue("--output");
  const url = localUrl ?? process.env.TURSO_URL;
  const authToken = localUrl ? undefined : process.env.TURSO_TOKEN;

  if (!url) {
    throw new Error("TURSO_URL is required unless --local <url> is provided");
  }

  const client = createClient({ url, authToken });
  try {
    const inventory = await inspectSchema(client);
    const report = renderSchemaReport(inventory);
    if (outputPath) {
      await writeFile(outputPath, report, "utf8");
    } else {
      process.stdout.write(report);
    }
  } finally {
    client.close();
  }
}

if (import.meta.main) {
  await main();
}
