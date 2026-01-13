import { PageInsertSchema } from "@/packages/validation/schemas/page/page.insert.schema";
import { IdSchema } from "@/packages/validation/utils/fields/id.schema";

/**
 * 更新独立页面时的数据验证 schema。
 */
export const PageUpdateSchema = PageInsertSchema.partial().extend({
  id: IdSchema,
});
