import { text } from "drizzle-orm/sqlite-core";

export function dateField(name: string, config?: any) {
  let column = text(name, config);
  column = column.$type<Date>();

  return {
    ...column,
    // 存入数据库时：Date → ISO 字符串
    mapToDriverValue(value: Date | null) {
      return value ? value.toISOString() : null;
    },
    // 查询出来时：ISO 字符串 → Date
    mapFromDriverValue(value: string | null) {
      return value ? new Date(value) : null;
    },
  };
}
