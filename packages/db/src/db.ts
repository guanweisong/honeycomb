import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * 创建 Turso/libSQL 数据库客户端。
 *
 * 重要提示：为了安全起见，数据库的 URL 和认证 Token (authToken)
 * 应该通过环境变量 (`process.env`) 来提供，而不应硬编码在代码中。
 *
 * @example
 * // .env.local
 * TURSO_URL="your_turso_db_url"
 * TURSO_TOKEN="your_turso_auth_token"
 */
const client = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!,
});

/**
 * 初始化 Drizzle ORM 实例。
 *
 * 将数据库客户端 (`client`) 与定义的数据库 schema 绑定，
 * 创建一个功能完备的 ORM 实例，用于后续的数据库操作。
 */
const dbInstance = drizzle(client, { schema });

/**
 * 导出的数据库实例。
 * 在整个应用程序中，应该使用此实例来执行所有数据库查询和操作。
 */
export const db = dbInstance;
