import { createInsertSchema } from "drizzle-zod";
import * as schema from "@/packages/db/schema";
import { I18nSchema } from "@/packages/validation/utils/i18n.schema";

/**
 * 新增独立页面时的数据验证 schema。
 */
export const PageInsertSchema = createInsertSchema(schema.page)
  .pick({
    title: true,
    content: true,
    status: true,
  })
  .extend({
    title: I18nSchema,
    content: I18nSchema,
  });
