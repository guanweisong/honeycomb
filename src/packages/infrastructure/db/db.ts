import "server-only";

import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "./schema";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { getDatabaseEnv } from "@/env/server";

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;

export type Database = LibSQLDatabase<typeof schema>;

/**
 * 获取数据库实例（lazy init）
 *
 * - 不允许在模块顶层创建 client
 * - 只在 runtime（API 请求）阶段执行
 */
export function getDb() {
  if (!db) {
    const { TURSO_URL: url, TURSO_TOKEN: authToken } = getDatabaseEnv();

    client = createClient({
      url,
      authToken,
    });

    db = drizzle(client, { schema });
  }

  return db;
}
