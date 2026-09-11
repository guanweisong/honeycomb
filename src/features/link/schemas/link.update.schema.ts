import { LinkInsertSchema } from "@/features/link/schemas/link.insert.schema";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { hasUpdateFields } from "@/packages/application/validation";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";

/**
 * 更新友情链接时的数据验证 schema。
 */
export const LinkUpdateSchema = LinkInsertSchema.partial().extend({
  id: IdSchema,
}).refine(hasUpdateFields, "至少修改一个字段");

export type LinkUpdate = CleanZod<typeof LinkUpdateSchema>;
