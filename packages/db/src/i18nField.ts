import { text } from "drizzle-orm/sqlite-core";
import { z } from "zod";

export const defaultI18nSchema = z.object({
  en: z.string().optional(),
  zh: z.string().optional(),
});

export type DefaultI18n = z.infer<typeof defaultI18nSchema>;

export function i18nField(name: string, config?: any) {
  let column = text(name, config);
  column = column.$type<DefaultI18n>();

  return {
    ...column,
    mapToDriverValue(value: DefaultI18n | null) {
      return value ? JSON.stringify(value) : null;
    },
    mapFromDriverValue(value: string | null) {
      return value ? defaultI18nSchema.parse(JSON.parse(value)) : null;
    },
  };
}
