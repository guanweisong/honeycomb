import "server-only";
import type { PostTagUpdate } from "./write-schema";
import type {
  PostCommandRepository,
  PostCreateCommand,
  PostUpdateCommand,
} from "./repository";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";
import { PostStatus } from "@/packages/domain/content/post-status";
import { DomainError } from "@/packages/domain/core/domain-error";
import { PostAggregate } from "../domain/post";
export type { PostCreateCommand, PostUpdateCommand } from "./repository";
/** 创建文章。 */
export async function createPost(
  repository: Pick<PostCommandRepository, "create">,
  input: PostCreateCommand,
  authorId: string,
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.create(input, authorId);
  const publicSync = await invalidator.invalidate({
    contents: [{ id: result.id, type: "post" }],
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...result, publicSync: publicSync.state };
}
/** 批量删除文章。 */
export async function destroyPosts(
  repository: Pick<PostCommandRepository, "destroy">,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.destroy(ids);
  const publicSync = await invalidator.invalidate({
    contents: ids.map((id) => ({ id, type: "post" })),
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...result, publicSync: publicSync.state };
}
/** 更新文章。 */
export async function updatePost(
  repository: Pick<PostCommandRepository, "findStatus" | "update">,
  input: PostUpdateCommand,
  invalidator: PublicContentInvalidator,
) {
  const result = await persistPostUpdate(repository, input);
  const publicSync = await invalidator.invalidate({
    contents: [{ id: input.id, type: "post" }],
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...result, publicSync: publicSync.state };
}
/** 替换文章标签关联。 */
export async function updatePostTags(
  repository: Pick<PostCommandRepository, "updateTags">,
  input: PostTagUpdate,
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.updateTags(input);
  const publicSync = await invalidator.invalidate({
    contents: [{ id: input.postId, type: "post" }],
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...result, publicSync: publicSync.state };
}
/** 增加公开文章浏览量。 */
export function incrementPostViews(
  repository: Pick<PostCommandRepository, "incrementViews">,
  id: string,
) {
  return repository.incrementViews(id);
}

function isPostStatus(status: string): status is PostStatus {
  return Object.values(PostStatus).some((value) => value === status);
}

/** 通过 Post 聚合执行发布命令，再交给 repository 持久化。 */
export async function publishPost(
  repository: Pick<PostCommandRepository, "update">,
  input: PostUpdateCommand & { status: PostStatus },
) {
  if (!input.status)
    throw new DomainError("发布文章必须提供当前状态", "MISSING_POST_STATUS");
  if (!isPostStatus(input.status))
    throw new DomainError("文章当前状态不合法", "INVALID_POST_STATUS");
  const aggregate = PostAggregate.rehydrate(input.id, input.status);
  aggregate.publish();
  return repository.update({
    ...input,
    status: PostStatus.PUBLISHED,
  });
}

/** 通过 Post 聚合执行撤回命令，再交给 repository 持久化。 */
export async function withdrawPost(
  repository: Pick<PostCommandRepository, "update">,
  input: PostUpdateCommand & { status: PostStatus },
) {
  if (!input.status)
    throw new DomainError("撤回文章必须提供当前状态", "MISSING_POST_STATUS");
  if (!isPostStatus(input.status))
    throw new DomainError("文章当前状态不合法", "INVALID_POST_STATUS");
  const aggregate = PostAggregate.rehydrate(input.id, input.status);
  aggregate.withdraw();
  return repository.update({
    ...input,
    status: PostStatus.DRAFT,
  });
}

/** 更新文章；状态变更必须经过 Post 聚合。 */
async function persistPostUpdate(
  repository: Pick<PostCommandRepository, "findStatus" | "update">,
  input: PostUpdateCommand,
) {
  if (input.status === undefined) return repository.update(input);

  const currentStatus = await repository.findStatus(input.id);
  if (!currentStatus) throw new DomainError("文章不存在", "POST_NOT_FOUND");
  if (currentStatus === input.status) return repository.update(input);

  if (input.status === PostStatus.PUBLISHED) {
    return publishPost(repository, { ...input, status: currentStatus });
  }
  if (input.status === PostStatus.DRAFT) {
    return withdrawPost(repository, { ...input, status: currentStatus });
  }
  throw new DomainError(
    `文章不支持变更为 ${input.status}`,
    "INVALID_POST_STATUS",
  );
}
