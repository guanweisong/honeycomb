import type { CommentTargetRepository } from "./comment-target-repository";
import type { CommentCommandRepository } from "./comment-command-repository";
import "server-only";

import { toPublicComment } from "./comment-public-dto";
import {
  assertCommentParentMatches,
  assertPublicTarget,
  toCommentTargetReference,
} from "./comment-target-policy";
import type { CommentStatus } from "../comment-status";
import { assertCommentTransition } from "../rules";
import { ApplicationError } from "@/lib/errors/application-error";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import type {
  CommentRequestMetadata,
  CommentUpdate,
  PublicCommentInput,
} from "../types";
export type { CommentUpdate, PublicCommentInput } from "../types";

export interface CreateCommentDependencies {
  repository: Pick<CommentCommandRepository, "createIfTargetMatches">;
  targetRepository: CommentTargetRepository;
  validateCaptcha: (token?: string) => Promise<void>;
  notify: (commentId: string, parentId?: string | null) => Promise<void>;
  logNotificationFailure: (error: unknown) => void;
  invalidator: PublicContentInvalidator;
}

/** 更新后台评论内容或状态。 */
export async function updateComment(
  repository: Pick<CommentCommandRepository, "findStatus" | "update">,
  input: CommentUpdate,
  invalidator: PublicContentInvalidator,
) {
  let expectedStatus: CommentStatus | undefined;
  if (input.status !== undefined) {
    const currentStatus = await repository.findStatus(input.id);
    if (!currentStatus) throw new ApplicationError("NOT_FOUND", "评论不存在");
    expectedStatus = currentStatus;
    if (currentStatus !== input.status) {
      assertCommentTransition(input.id, currentStatus, input.status);
    }
  }
  const result = await repository.update(input, expectedStatus);
  if (!result) {
    // 条件写入失败后只重读以区分删除与并发审核，不重放过期的更新。
    const status = await repository.findStatus(input.id);
    if (!status) throw new ApplicationError("NOT_FOUND", "评论不存在");
    throw new ApplicationError("CONFLICT", "评论状态已变更，请刷新后重新审核");
  }
  const publicSync = await invalidator.invalidate({ refreshLayout: true });
  return { ...result, publicSync: publicSync.state };
}
/** 批量删除后台评论。 */
export async function destroyComments(
  repository: Pick<CommentCommandRepository, "destroy">,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.destroy(ids);
  const publicSync = await invalidator.invalidate({ refreshLayout: true });
  return { ...result, publicSync: publicSync.state };
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
  await invalidator.invalidate(
    target.type === "custom"
      ? { refreshLayout: true }
      : {
          contents: [{ id: target.id, type: target.type }],
          refreshLayout: true,
        },
  );
  return toPublicComment(created);
}
