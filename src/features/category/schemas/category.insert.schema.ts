import { z } from "zod";
import { I18nSchema, requiredString } from "@/lib/validation/validation";
import { EnableStatus } from "@/lib/validation/enable-status";

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
