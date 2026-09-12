import {
  I18nSchema,
  requiredString,
  hasUpdateFields,
} from "@/packages/application/validation";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { z } from "zod";
import { EnableStatus } from "@/packages/domain/shared/enable-status";

/**
 * 新增分类时的数据验证 schema，不依赖数据库表结构。
 */
export const CategoryInsertSchema = z.object({
  title: I18nSchema,
  description: I18nSchema,
  parent: z.string().nullable().optional(),
  status: z.enum(EnableStatus, { message: "分类状态不合法" }).optional(),
  path: requiredString("path不能为空"),
});

export type CategoryInsert = z.output<typeof CategoryInsertSchema>;

export const CategoryUpdateSchema = CategoryInsertSchema.partial()
  .extend({ id: IdSchema })
  .refine(hasUpdateFields, "至少修改一个字段");
export type CategoryUpdate = z.output<typeof CategoryUpdateSchema>;
