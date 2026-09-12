import { sql } from "drizzle-orm";
import {
  check,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

/** 从领域权威值集合生成数据库枚举 CHECK，不复制成员。 */
export function enumCheck(
  name: string,
  column: AnySQLiteColumn,
  values: readonly string[],
) {
  if (values.length === 0) throw new Error("Enum check values cannot be empty");
  const members = values
    .map((value) => `'${value.replaceAll("'", "''")}'`)
    .join(", ");
  return check(name, sql`${column} in (${sql.raw(members)})`);
}
