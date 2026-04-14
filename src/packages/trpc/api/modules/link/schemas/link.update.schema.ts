import { LinkInsertSchema } from "@/packages/trpc/api/modules/link/schemas/link.insert.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";

/**
 * 更新友情链接时的数据验证 schema。
 */
export const LinkUpdateSchema = LinkInsertSchema.partial().extend({
  id: IdSchema,
});

export type LinkUpdate = CleanZod<typeof LinkUpdateSchema>;
