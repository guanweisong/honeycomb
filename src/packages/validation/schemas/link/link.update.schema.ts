import { LinkInsertSchema } from "@/packages/validation/schemas/link/link.insert.schema";
import { IdSchema } from "@/packages/validation/utils/fields/id.schema";

/**
 * 更新友情链接时的数据验证 schema。
 */
export const LinkUpdateSchema = LinkInsertSchema.partial().extend({
  id: IdSchema,
});
