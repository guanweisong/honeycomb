import { I18nSchema } from "@/packages/trpc/api/schemas/i18n.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { z } from "zod";

/**
 * 新增独立页面时的数据验证 schema，不依赖数据库表结构。
 */
export const PageInsertSchema = z.object({
    title: I18nSchema,
    content: I18nSchema,
    status: z.string().optional(),
    template: z.enum([PageTemplate.DEFAULT, PageTemplate.FRIENDLY_LINKS]),
  });

export type PageInsert = CleanZod<typeof PageInsertSchema>;
