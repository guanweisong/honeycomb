import { ObjectId } from "bson";
import {
  tableJsonFields,
  tableDateFields,
  TableName,
  tableMap,
} from "./schema";
import { and, eq, asc, desc, sql, inArray } from "drizzle-orm";

// JSON parse/stringify
export function parseJsonField<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
export function stringifyJsonField<T>(
  value: T | null | undefined,
): string | null {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

// parseRow / prepareRow
export function parseRow<T extends Record<string, any>>(
  row: T,
  jsonFields: ReadonlyArray<string>,
  dateFields: ReadonlyArray<string>,
) {
  const r = { ...row } as any;
  for (const f of jsonFields) if (row[f] != null) r[f] = parseJsonField(row[f]);
  for (const f of dateFields) if (row[f]) r[f] = new Date(row[f]);
  return r as T;
}

export function prepareRowForDb<T extends Record<string, any>>(
  row: T,
  jsonFields: ReadonlyArray<string>,
  dateFields: ReadonlyArray<string>,
) {
  const r = { ...row } as any;
  for (const f of jsonFields)
    if (row[f] != null) r[f] = stringifyJsonField(row[f]);
  for (const f of dateFields)
    if (row[f] instanceof Date) r[f] = (row[f] as Date).toISOString();
  return r as T;
}

// where builder (supports simple equality map)
function buildWhere(table: any, where?: Partial<Record<string, any>>) {
  if (!where) return undefined as any;
  const entries = Object.entries(where);
  if (entries.length === 0) return undefined as any;
  const clauses = entries
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => eq((table as any)[k], v as any));
  if (clauses.length === 0) return undefined as any;
  // Single or compound condition
  return clauses.length === 1 ? clauses[0] : and(...clauses);
}

// 泛型类型安全（放宽 DbRow 约束，避免过度收紧导致 TS 报错）
export type DbRow<T extends TableName> = Record<string, any>;

// ================== CRUD ==================
export async function selectFromTableTyped<T extends TableName>(
  table: any,
  tableName: T,
  db: any,
  where?: Partial<Record<string, any>>,
): Promise<DbRow<T>[]> {
  let q = db.select().from(table);
  const condition = buildWhere(table, where);
  if (condition) q = q.where(condition as any);
  const rows = await q;
  return rows.map((r: any) =>
    parseRow(r, tableJsonFields[tableName], tableDateFields[tableName]),
  ) as DbRow<T>[];
}

export async function insertIntoTableTyped<T extends TableName>(
  table: any,
  tableName: T,
  db: any,
  data: DbRow<T>,
) {
  const row = { ...data } as any;
  if (!row.id) row.id = new ObjectId().toHexString();
  const p = prepareRowForDb(
    row,
    tableJsonFields[tableName],
    tableDateFields[tableName],
  );
  await db.insert(table).values(p);
}

export async function bulkInsertIntoTableTyped<T extends TableName>(
  table: any,
  tableName: T,
  db: any,
  data: DbRow<T>[],
) {
  const preparedRows = data.map((r) => {
    const row = { ...r } as any;
    if (!row.id) row.id = new ObjectId().toHexString();
    return prepareRowForDb(
      row,
      tableJsonFields[tableName],
      tableDateFields[tableName],
    );
  });
  await db.insert(table).values(preparedRows);
}

export async function updateTableRowTyped<T extends TableName>(
  table: any,
  tableName: T,
  db: any,
  data: Partial<DbRow<T>>,
  where: Partial<Record<string, any>>,
) {
  const p = prepareRowForDb(
    data as any,
    tableJsonFields[tableName],
    tableDateFields[tableName],
  );
  const condition = buildWhere(table, where);
  await db.update(table).set(p).where(condition as any);
}

export async function deleteFromTableTyped<T extends TableName>(
  table: any,
  db: any,
  where: Partial<Record<string, any>>,
) {
  const condition = buildWhere(table, where);
  await db.delete(table).where(condition as any);
}

export async function upsertTableRowTyped<T extends TableName>(
  table: any,
  tableName: T,
  db: any,
  data: DbRow<T>,
  primaryKey: keyof DbRow<T>,
) {
  const pkValue = (data as any)[primaryKey as string] ?? new ObjectId().toHexString();
  const row = { ...(data as any), [primaryKey as string]: pkValue };
  const existing = await selectFromTableTyped(table, tableName, db, {
    [primaryKey as string]: pkValue,
  });
  if (existing.length > 0) {
    await updateTableRowTyped(table, tableName, db, row, {
      [primaryKey as string]: pkValue,
    });
  } else {
    await insertIntoTableTyped(table, tableName, db, row);
  }
}

// Advanced select with options
type SelectOptions = {
  // simple equality map
  where?: Partial<Record<string, any>>;
  // raw drizzle where expression (takes precedence over where if provided)
  whereExpr?: any;
  orderBy?: { field: string; direction?: "asc" | "desc" };
  limit?: number;
  offset?: number;
};

// util: snake_case -> camelCase
function toCamelCase(input: string) {
  return input.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export async function selectFromTableAdvanced<T extends TableName>(
  table: any,
  tableName: T,
  db: any,
  options?: SelectOptions,
): Promise<DbRow<T>[]> {
  const { where, whereExpr, orderBy: ob, limit, offset } = options || {};
  let q = db.select().from(table);
  if (whereExpr) {
    q = q.where(whereExpr as any);
  } else {
    const condition = buildWhere(table, where);
    if (condition) q = q.where(condition as any);
  }
  if (ob?.field) {
    const dir = (ob.direction || "asc").toLowerCase();
    const fieldKey = ob.field in table ? ob.field : toCamelCase(ob.field);
    const col = (table as any)[fieldKey];
    if (col) {
      q = q.orderBy((dir === "asc" ? asc : desc)(col as any));
    }
  }
  if (typeof limit === "number") q = q.limit(limit);
  if (typeof offset === "number") q = q.offset(offset);
  const rows = await q;
  return rows.map((r: any) =>
    parseRow(r, tableJsonFields[tableName], tableDateFields[tableName]),
  ) as DbRow<T>[];
}

export async function countFromTable<T extends TableName>(
  table: any,
  db: any,
  where?: Partial<Record<string, any>>,
  whereExpr?: any,
): Promise<number> {
  let q = db.select({ count: sql`count(*)`.mapWith(Number) }).from(table);
  if (whereExpr) {
    q = q.where(whereExpr as any);
  } else {
    const condition = buildWhere(table, where);
    if (condition) q = q.where(condition as any);
  }
  const [{ count }] = await q;
  return count as number;
}

export async function deleteAllFromTable(table: any, db: any) {
  await db.delete(table);
}

export async function deleteByIdsFromTable(
  table: any,
  db: any,
  ids: string[],
) {
  if (!ids || ids.length === 0) return;
  await db.delete(table).where(inArray((table as any).id, ids as any));
}

// ================== 表名映射接口 ==================
export function createDbTablesProxy(dbInstance: any) {
  const proxy: any = {};
  for (const key in tableMap) {
    const table = tableMap[key as TableName];
    const tableName = key as TableName;
    proxy[tableName] = {
      // select can accept a where map or advanced options
      select: (
        arg?: Partial<Record<string, any>> | SelectOptions,
      ) =>
        ("orderBy" in (arg || {}) || "limit" in (arg || {}) || "offset" in (arg || {}) || "whereExpr" in (arg || {})
          ? selectFromTableAdvanced(table, tableName, dbInstance, arg as SelectOptions)
          : selectFromTableTyped(table, tableName, dbInstance, arg as any)
        ),
      count: (where?: Partial<Record<string, any>>, whereExpr?: any) =>
        countFromTable(table, dbInstance, where, whereExpr),
      insert: (data: DbRow<typeof tableName>) =>
        insertIntoTableTyped(table, tableName, dbInstance, data),
      update: (
        data: Partial<DbRow<typeof tableName>>,
        where: Partial<Record<string, any>>,
      ) => updateTableRowTyped(table, tableName, dbInstance, data, where),
      delete: (where: Partial<Record<string, any>>) =>
        deleteFromTableTyped(table, dbInstance, where),
      deleteAll: () => deleteAllFromTable(table, dbInstance),
      deleteByIds: (ids: string[]) => deleteByIdsFromTable(table, dbInstance, ids),
      bulkInsert: (data: DbRow<typeof tableName>[]) =>
        bulkInsertIntoTableTyped(table, tableName, dbInstance, data),
      upsert: (
        data: DbRow<typeof tableName>,
        primaryKey: keyof DbRow<typeof tableName>,
      ) => upsertTableRowTyped(table, tableName, dbInstance, data, primaryKey),
    };
  }
  return proxy as Record<TableName, any>;
}
