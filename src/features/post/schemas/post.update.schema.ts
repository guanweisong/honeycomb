import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import type { z } from "zod";
import type { PostUpdateCommand } from "../application/repository";

/**
 * 更新文章时的数据验证 schema。
 */
export const PostUpdateSchema = PostInsertSchema.partial().extend({
  id: IdSchema,
});

export type PostUpdate = CleanZod<typeof PostUpdateSchema>;

type Assert<T extends true> = T;
export type PostUpdateOutputMatchesCommand = Assert<
  z.output<typeof PostUpdateSchema> extends PostUpdateCommand ? true : false
>;
