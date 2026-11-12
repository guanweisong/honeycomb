import "server-only";

import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "@/lib/db/schema";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { getDatabaseEnv } from "@/env/server";

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;

export type Database = LibSQLDatabase<typeof schema>;

/**
 * 获取数据库实例（lazy init）
 *
 * - 不允许在模块顶层创建 client
 * - 仅从显式服务端入口调用，包括运行时请求和详情路径构建参数生成
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
