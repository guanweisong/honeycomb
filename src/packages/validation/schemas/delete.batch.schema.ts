import { IdSchema } from "./fields/id.schema";
import { z } from "zod";

/**
 * 批量删除操作的数据验证 schema。
 *
 * 此 schema 用于验证批量删除请求的主体。
 * 它要求请求体是一个包含 `ids` 字段的对象，
 * 且 `ids` 字段必须是一个由符合 `IdSchema` 规范的 ID 组成的数组。
 */
export const DeleteBatchSchema = z.object({
  ids: IdSchema.array(),
});
