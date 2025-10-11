import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { post } from "@honeycomb/db/src/schema";
import { defaultI18nSchema } from "@honeycomb/db/src/i18nField";
import { UserEntitySchema } from "@honeycomb/validation/user/schemas/user.entity.schema";
import { MediaEntitySchema } from "@honeycomb/validation/media/schemas/media.entity.schema";

export const PostEntitySchema = createSelectSchema(post).extend({
  title: defaultI18nSchema,
  quoteContent: defaultI18nSchema,
  quoteAuthor: defaultI18nSchema,
  excerpt: defaultI18nSchema,
  author: UserEntitySchema,
  cover: MediaEntitySchema,
});

export type PostEntity = CleanZod<typeof PostEntitySchema>;
