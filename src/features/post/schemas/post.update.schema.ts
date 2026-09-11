import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { hasUpdateFields } from "@/packages/application/validation";
import type { CleanZod } from "@/packages/application/validation";
import type { z } from "zod";
import type { PostUpdateCommand } from "../application/repository";

/**
 * 更新文章时的数据验证 schema。
 */
export const PostUpdateSchema = PostInsertSchema.partial().extend({
  id: IdSchema,
}).refine(hasUpdateFields, "至少修改一个字段");

export type PostUpdate = CleanZod<typeof PostUpdateSchema>;

type Assert<T extends true> = T;
export type PostUpdateOutputMatchesCommand = Assert<
  z.output<typeof PostUpdateSchema> extends PostUpdateCommand ? true : false
>;
