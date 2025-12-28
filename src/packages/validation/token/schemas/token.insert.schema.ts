import { z } from "zod";
import { IdSchema } from "../../schemas/fields/id.schema";
import { ContentSchema } from "./fields/content.schema";

/**
 * 新增 Token 时的数据验证 schema。
 *
 * 此 schema 用于验证创建一个新 token 所需的数据。
 * 包含以下字段：
 * - `userId`: Token 所属用户的 ID，必须符合 `IdSchema` 规范。
 * - `content`: Token 的具体内容，必须符合 `ContentSchema` 规范。
 */
export const TokenInsertSchema = z.object({
  userId: IdSchema,
  content: ContentSchema,
});
