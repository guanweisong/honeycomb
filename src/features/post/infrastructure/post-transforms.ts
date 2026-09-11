import type { InferInsertModel } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { PostCreateCommand, PostUpdateCommand } from "../application/repository";
export type { PostCreateCommand, PostUpdateCommand } from "../application/repository";
type PostInsertValues = InferInsertModel<typeof schema.post>;
/** 将文章输入转换为可持久化结构。 */
export function toPostInsertValues(input: PostCreateCommand, authorId: string): PostInsertValues {
  return {
    authorId,
    categoryId: input.categoryId,
    status: input.status,
    type: input.type,
    coverId: input.coverId,
    commentStatus: input.commentStatus,
    movieTime: input.movieTime,
    galleryTime: input.galleryTime,
  } satisfies PostInsertValues;
}
/** 将文章更新输入转换为可持久化结构。 */
export function toPostUpdateValues(input: Omit<PostUpdateCommand, "id">): Partial<PostInsertValues> {
  return {
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.coverId !== undefined ? { coverId: input.coverId } : {}),
    ...(input.commentStatus !== undefined ? { commentStatus: input.commentStatus } : {}),
    ...(input.movieTime !== undefined ? { movieTime: input.movieTime } : {}),
    ...(input.galleryTime !== undefined ? { galleryTime: input.galleryTime } : {}),
  } satisfies Partial<PostInsertValues>;
}
