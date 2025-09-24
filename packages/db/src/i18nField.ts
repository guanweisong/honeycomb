import { customType } from "drizzle-orm/sqlite-core";
import { z } from "zod";

export const defaultI18nSchema = z.object({
  en: z.string().optional(),
  zh: z.string().optional(),
});

export type DefaultI18n = z.infer<typeof defaultI18nSchema>;

export function i18nField(name: string) {
  return customType<{ data: DefaultI18n | null; driverData: string }>({
    dataType() {
      return "text"; // SQLite 存 JSON 字符串
    },
    toDriver(value: DefaultI18n | null): string {
      // Drizzle 不允许返回 null，这里返回空 JSON '{}'
      return value ? JSON.stringify(value) : "{}";
    },
    fromDriver(value: string): DefaultI18n | null {
      // 查询出来可能是 '{}' 或正常 JSON
      if (!value) return null;
      try {
        return defaultI18nSchema.parse(JSON.parse(value));
      } catch {
        return null;
      }
    },
  })(name);
}
