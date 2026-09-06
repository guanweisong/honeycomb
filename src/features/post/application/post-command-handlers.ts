import { PostStatus } from "@/packages/domain/content/post-status";
import { DomainError } from "@/packages/domain/core/domain-error";
import { PostAggregate } from "../domain/post";
import type { PostCommandRepository, PostUpdateCommand } from "./repository";

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
export async function updatePost(
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
