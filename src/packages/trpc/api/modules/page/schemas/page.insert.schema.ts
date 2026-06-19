import { createInsertSchema } from "drizzle-zod";
import * as schema from "@/packages/db/schema";
import { I18nSchema } from "@/packages/trpc/api/schemas/i18n.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import { PageTemplate } from "@/packages/trpc/api/modules/page/types/page.template";
import { z } from "zod";

/**
 * 新增独立页面时的数据验证 schema。
 */
export const PageInsertSchema = createInsertSchema(schema.page)
  .pick({
    title: true,
    content: true,
    status: true,
    template: true,
  })
  .extend({
    title: I18nSchema,
    content: I18nSchema,
    template: z.enum([PageTemplate.DEFAULT, PageTemplate.FRIENDLY_LINKS]),
  });

export type PageInsert = CleanZod<typeof PageInsertSchema>;
