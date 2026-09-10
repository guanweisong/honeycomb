import "server-only";

import { toPublicComment } from "../comment-dto";
import { moderateComment } from "./comment-command-handlers";
import { ApplicationError } from "@/packages/application/errors";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";
import type {
  CommentCommandRepository,
  CommentUpdate,
  PublicCommentInput,
} from "./repository";
export type { CommentUpdate, PublicCommentInput } from "./repository";

export interface CreateCommentDependencies {
  repository: Pick<CommentCommandRepository, "create">;
  validateCaptcha: (token?: string) => Promise<void>;
  notify: (commentId: string, parentId?: string | null) => Promise<void>;
  logNotificationFailure: (error: unknown) => void;
  invalidator: Pick<PublicContentInvalidator, "invalidateContent">;
}

/** 更新后台评论内容或状态。 */
export async function updateComment(
  repository: Pick<CommentCommandRepository, "findStatus" | "update">,
  input: CommentUpdate,
  invalidator: Pick<PublicContentInvalidator, "invalidateAll">,
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
  invalidator: Pick<PublicContentInvalidator, "invalidateAll">,
) {
  const result = await repository.destroy(ids);
  await invalidator.invalidateAll();
  return result;
}
/** 创建公开评论并触发异步通知。 */
export async function createComment(
  dependencies: CreateCommentDependencies,
  headers: Headers,
  input: PublicCommentInput & { captchaToken?: string },
) {
  const {
    repository,
    validateCaptcha,
    notify,
    logNotificationFailure,
    invalidator,
  } = dependencies;
  const { captchaToken, ...comment } = input;
  await validateCaptcha(captchaToken);
  const created = await repository.create(headers, comment);
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
