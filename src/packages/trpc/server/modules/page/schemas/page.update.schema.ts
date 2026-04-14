import { PageInsertSchema } from "@/packages/trpc/server/modules/page/schemas/page.insert.schema";
import { IdSchema } from "@/packages/trpc/server/schemas/fields/id.schema";
import { CleanZod } from "@/packages/trpc/server/schemas/clean.zod";

/**
 * 更新独立页面时的数据验证 schema。
 */
export const PageUpdateSchema = PageInsertSchema.partial().extend({
  id: IdSchema,
});

export type PageUpdate = CleanZod<typeof PageUpdateSchema>;
