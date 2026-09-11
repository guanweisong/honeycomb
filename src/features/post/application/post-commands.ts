import "server-only";
import type { PostTagUpdate } from "./write-schema";
import type {
  PostCommandRepository,
  PostCreateCommand,
  PostUpdateCommand,
} from "./repository";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";
import { updatePost as updatePostThroughAggregate } from "./post-command-handlers";
export type { PostCreateCommand, PostUpdateCommand } from "./repository";
/** 创建文章。 */
export async function createPost(
  repository: Pick<PostCommandRepository, "create">,
  input: PostCreateCommand,
  authorId: string,
  invalidator: Pick<PublicContentInvalidator, "invalidateContent">,
) {
  const result = await repository.create(input, authorId);
  await invalidator.invalidateContent({ id: result.id, type: "post" });
  return result;
}
/** 批量删除文章。 */
export async function destroyPosts(
  repository: Pick<PostCommandRepository, "destroy">,
  ids: string[],
  invalidator: Pick<PublicContentInvalidator, "invalidateContent">,
) {
  const result = await repository.destroy(ids);
  await Promise.all(
    ids.map((id) => invalidator.invalidateContent({ id, type: "post" })),
  );
  return result;
}
/** 更新文章。 */
export async function updatePost(
  repository: Pick<PostCommandRepository, "findStatus" | "update">,
  input: PostUpdateCommand,
  invalidator: Pick<PublicContentInvalidator, "invalidateContent">,
) {
  const result = await updatePostThroughAggregate(repository, input);
  await invalidator.invalidateContent({ id: input.id, type: "post" });
  return result;
}
/** 替换文章标签关联。 */
export async function updatePostTags(
  repository: Pick<PostCommandRepository, "updateTags">,
  input: PostTagUpdate,
  invalidator: Pick<PublicContentInvalidator, "invalidateContent">,
) {
  const result = await repository.updateTags(input);
  await invalidator.invalidateContent({ id: input.postId, type: "post" });
  return result;
}
/** 增加公开文章浏览量。 */
export function incrementPostViews(
  repository: Pick<PostCommandRepository, "incrementViews">,
  id: string,
) {
  return repository.incrementViews(id);
}
