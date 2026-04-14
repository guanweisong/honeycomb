import { createInsertSchema } from "drizzle-zod";
import * as schema from "@/packages/db/schema";
import { I18nSchema } from "@/packages/trpc/server/schemas/i18n.schema";
import { requiredString } from "@/packages/trpc/server/schemas/required.string.schema";
import { CleanZod } from "@/packages/trpc/server/schemas/clean.zod";

/**
 * 新增分类时的数据验证 schema。
 */
export const CategoryInsertSchema = createInsertSchema(schema.category)
  .pick({
    title: true,
    description: true,
    parent: true,
    status: true,
    path: true,
  })
  .extend({
    title: I18nSchema,
    description: I18nSchema,
    path: requiredString("path不能为空"),
  });

export type CategoryInsert = CleanZod<typeof CategoryInsertSchema>;
