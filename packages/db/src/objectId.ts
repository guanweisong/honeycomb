import { sql } from "drizzle-orm";

/**
 * 生成 MongoDB 风格的 ObjectId (24位十六进制)
 * 使用 SQLite 的 randomblob 和 hex 函数
 */
export const objectId = () => sql`lower(hex(randomblob(12)))`;
