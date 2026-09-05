import { I18nSchema } from "@/packages/application/validation";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { z } from "zod";
import { PageStatus } from "@/packages/domain/content/page";

/**
 * 新增独立页面时的数据验证 schema，不依赖数据库表结构。
 */
export const PageInsertSchema = z.object({
  title: I18nSchema,
  content: I18nSchema,
  status: z.enum(PageStatus).optional(),
  template: z.enum(PageTemplate),
});

export type PageInsert = z.output<typeof PageInsertSchema>;
