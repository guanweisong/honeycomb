import { createSelectSchema } from "drizzle-zod";
import { setting } from "@honeycomb/db/src/schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { defaultI18nSchema } from "@honeycomb/db/src/i18nField";

export const SettingEntitySchema = createSelectSchema(setting).extend({
  siteName: defaultI18nSchema,
  siteSubName: defaultI18nSchema,
  siteCopyright: defaultI18nSchema,
  siteSignature: defaultI18nSchema,
});

export type SettingEntity = CleanZod<typeof SettingEntitySchema>;
