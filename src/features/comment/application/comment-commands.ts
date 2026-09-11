import "server-only";

import { toPublicComment } from "./comment-public-dto";
import {
  assertCommentParentMatches,
  assertPublicTarget,
  toCommentTargetReference,
} from "./comment-target-policy";
import { moderateComment } from "./comment-command-handlers";
import { ApplicationError } from "@/packages/application/errors";
import type { PublicContentReference } from "@/packages/application/public-content-invalidator";
import type {
  CommentCommandRepository,
  CommentRequestMetadata,
  CommentTargetRepository,
  CommentUpdate,
  PublicCommentInput,
} from "./repository";
export type { CommentUpdate, PublicCommentInput } from "./repository";

export interface CreateCommentDependencies {
  repository: Pick<CommentCommandRepository, "createIfTargetMatches">;
  targetRepository: CommentTargetRepository;
  validateCaptcha: (token?: string) => Promise<void>;
  notify: (commentId: string, parentId?: string | null) => Promise<void>;
  logNotificationFailure: (error: unknown) => void;
  invalidator: CommentContentInvalidator;
}

type CommentContentInvalidator = {
  invalidateContent(reference: PublicContentReference): Promise<void>;
};

type CommentAllInvalidator = {
  invalidateAll(): Promise<void>;
};

/** 更新后台评论内容或状态。 */
export async function updateComment(
  repository: Pick<CommentCommandRepository, "findStatus" | "update">,
  input: CommentUpdate,
  invalidator: CommentAllInvalidator,
) {
  let result;
  if (input.status === undefined) {
    result = await repository.update(input);
  } else {
    const currentStatus = await repository.findStatus(input.id);
    if (!currentStatus) throw new ApplicationError("NOT_FOUND", "评论不存在");
    result =
      currentStatus === input.status
        ? await repository.update(input)
        : await moderateComment(repository, {
            ...input,
            currentStatus,
            status: input.status,
          });
  }
  await invalidator.invalidateAll();
  return result;
}
/** 批量删除后台评论。 */
export async function destroyComments(
  repository: Pick<CommentCommandRepository, "destroy">,
  ids: string[],
  invalidator: CommentAllInvalidator,
) {
  const result = await repository.destroy(ids);
  await invalidator.invalidateAll();
  return result;
}
/** 创建公开评论并触发异步通知。 */
export async function createComment(
  dependencies: CreateCommentDependencies,
  metadata: CommentRequestMetadata,
  input: PublicCommentInput & { captchaToken?: string },
) {
  const {
    repository,
    targetRepository,
    validateCaptcha,
    notify,
    logNotificationFailure,
    invalidator,
  } = dependencies;
  const { captchaToken, ...comment } = input;
  await validateCaptcha(captchaToken);
  const target = toCommentTargetReference(comment);
  const expectedTarget = await assertPublicTarget(targetRepository, target);
  if (comment.parentId)
    await assertCommentParentMatches(
      targetRepository,
      comment.parentId,
      target,
    );
  const created = await repository.createIfTargetMatches(
    metadata,
    comment,
    expectedTarget,
  );
  if (!created) {
    // 重新读取仅用于友好错误；任何竞态失败都不能继续通知或刷新缓存。
    await assertPublicTarget(targetRepository, target);
    if (comment.parentId)
      await assertCommentParentMatches(
        targetRepository,
        comment.parentId,
        target,
      );
    throw new ApplicationError("BAD_REQUEST", "评论目标已变更，请刷新后重试");
  }
  try {
    await notify(created.id, comment.parentId);
  } catch (error) {
    logNotificationFailure(error);
  }
  if (comment.postId) {
    await invalidator.invalidateContent({ id: comment.postId, type: "post" });
  } else if (comment.pageId) {
    await invalidator.invalidateContent({ id: comment.pageId, type: "page" });
  }
  return toPublicComment(created);
}
