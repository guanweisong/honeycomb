import { createClient, type Client } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "./schema";
import { LibSQLDatabase } from "drizzle-orm/libsql";

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;

/**
 * 获取数据库实例（lazy init）
 *
 * - 不允许在模块顶层创建 client
 * - 只在 runtime（API 请求）阶段执行
 */
export function getDb() {
  if (!db) {
    const url = process.env.TURSO_URL;
    const authToken = process.env.TURSO_TOKEN;

    if (!url) {
      throw new Error("TURSO_URL is missing");
    }

    client = createClient({
      url,
      authToken,
    });

    db = drizzle(client, { schema });
  }

  return db;
}
