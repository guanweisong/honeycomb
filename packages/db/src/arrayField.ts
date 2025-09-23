import { text } from "drizzle-orm/sqlite-core";

export function arrayField<T = string>(name: string, config?: any) {
  let column = text(name, config);
  column = column.$type<T[]>();

  return {
    ...column,
    // 存入数据库时：数组 -> JSON 字符串
    mapToDriverValue(value: T[] | null) {
      return value ? JSON.stringify(value) : null;
    },
    // 查询数据库时：JSON 字符串 -> 数组
    mapFromDriverValue(value: string | null) {
      return value ? (JSON.parse(value) as T[]) : [];
    },
  };
}
