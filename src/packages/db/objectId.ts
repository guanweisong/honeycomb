import { sql } from "drizzle-orm";

/**
 * 生成一个模拟 MongoDB ObjectId 的 SQL 片段。
 *
 * ObjectId 是一个 24 位的十六进制字符串。此函数利用 SQLite 的内置函数生成该 ID：
 * 1. `randomblob(12)`: 生成一个 12 字节的随机二进制数据。
 * 2. `hex()`: 将二进制数据转换为十六进制字符串（24个字符）。
 * 3. `lower()`: 将字符串转换为小写，以保持格式统一。
 *
 * @returns {SQL} 一个 Drizzle ORM 的 SQL 片段，可在定义表结构时用作默认值生成器。
 */
export const objectId = () => sql`lower(hex(randomblob(12)))`;
