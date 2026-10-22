import { z } from "zod";
import { IdSchema } from "@/lib/validation/id.schema";

/** 分类删除没有业务数量上限，仍拒绝空批次与无效 ID。 */
export const CategoryDeleteSchema = z.object({
  ids: IdSchema.array().min(1),
});
