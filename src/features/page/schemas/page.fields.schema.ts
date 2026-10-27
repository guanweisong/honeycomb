import { z } from "zod";
import { I18nSchema } from "@/lib/validation/validation";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";

export const PageVersionSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

/**
 * 新增独立页面时的数据验证 schema，不依赖数据库表结构。
 */
export const PageFieldsSchema = z.strictObject({
  title: I18nSchema,
  content: I18nSchema,
  status: z.enum(PageStatus).optional(),
  template: z.enum(PageTemplate),
});
