import { TokenInsertSchema } from "./token.insert.schema";
import { IdSchema } from "@/packages/validation/utils/fields/id.schema";

/**
 * 更新 Token 时的数据验证 schema。
 */
export const TokenUpdateSchema = TokenInsertSchema.partial().extend({
  id: IdSchema,
});
