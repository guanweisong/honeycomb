import { z } from "zod";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { ContentSchema } from "./fields/content.schema";
import { requiredString } from "@/packages/trpc/api/schemas/required.string.schema";

/**
 * 新增 Token 时的数据验证 schema。
 */
export const TokenInsertSchema = z.object({
  userId: IdSchema,
  content: requiredString("token不能为空"),
});
