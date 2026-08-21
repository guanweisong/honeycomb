import { I18nSchema } from "@/packages/trpc/api/schemas/i18n.schema";
import { z } from "zod";

/**
 * 新增标签时的数据验证 schema。
 * 该 schema 定义标签输入契约，不依赖数据库表结构。
 */
export const TagInsertSchema = z.object({
  name: I18nSchema,
});
