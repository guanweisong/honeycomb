import { customType } from "drizzle-orm/sqlite-core";
import { z } from "zod";

export const defaultI18nSchema = z
  .object({
    en: z.string(),
    zh: z.string(),
  })
  .nullable();

export type DefaultI18n = z.infer<typeof defaultI18nSchema>;

export function i18nField(name: string) {
  return customType<{
    data: DefaultI18n | null;
    driverData: string;
  }>({
    dataType() {
      return "text";
    },
    toDriver(value: DefaultI18n | null): string {
      return value ? JSON.stringify(value) : "{}";
    },
    fromDriver(value: string): DefaultI18n | null {
      if (!value) return null;
      try {
        return defaultI18nSchema.parse(JSON.parse(value));
      } catch {
        return null;
      }
    },
  })(name);
}
