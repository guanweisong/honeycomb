import { LinkInsertSchema } from "@/features/link/schemas/link.insert.schema";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";

/**
 * 更新友情链接时的数据验证 schema。
 */
export const LinkUpdateSchema = LinkInsertSchema.partial().extend({
  id: IdSchema,
});

export type LinkUpdate = CleanZod<typeof LinkUpdateSchema>;
