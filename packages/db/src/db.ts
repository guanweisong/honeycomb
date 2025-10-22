import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "./schema";
import { env } from "@honeycomb/env/index";

/**
 * 创建 Turso/libSQL 数据库客户端。
 */
const client = createClient({
  url: env.TURSO_URL!,
  authToken: env.TURSO_TOKEN,
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
