import { createSelectSchema } from "drizzle-zod";
import { tag } from "@honeycomb/db/src/schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { defaultI18nSchema } from "@honeycomb/db/src/i18nField";

export const TagEntitySchema = createSelectSchema(tag).extend({
  name: defaultI18nSchema,
});

export type TagEntity = CleanZod<typeof TagEntitySchema>;
