import { I18nSchema } from "@/packages/trpc/api/schemas/i18n.schema";
import { requiredString } from "@/packages/trpc/api/schemas/required.string.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import { z } from "zod";

/**
 * 新增分类时的数据验证 schema，不依赖数据库表结构。
 */
export const CategoryInsertSchema = z.object({
    title: I18nSchema,
    description: I18nSchema,
    parent: z.string().nullable().optional(),
    status: z.string().optional(),
    path: requiredString("path不能为空"),
  });

export type CategoryInsert = CleanZod<typeof CategoryInsertSchema>;
