import "server-only";

import { toPublicComment } from "../comment-dto";
import { moderateComment } from "./comment-command-handlers";
import type { CommentStatus } from "@/packages/domain/content/comment";
import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { ApplicationError } from "@/packages/application/errors";
import type { CommentCommandRepository, CommentUpdate, PublicCommentInput } from "./repository";
export type { CommentUpdate, PublicCommentInput } from "./repository";

/** 更新后台评论内容或状态。 */
export async function updateComment(
  repository: CommentCommandRepository,
  input: CommentUpdate,
  bus?: InProcessEventBus,
) {
  if (input.status === undefined) return repository.update(input);

  const currentStatus = await repository.findStatus(input.id);
  if (!currentStatus) throw new ApplicationError("NOT_FOUND", "评论不存在");
  if (currentStatus === input.status) return repository.update(input);

  return moderateComment(
    repository,
    { ...input, currentStatus: currentStatus as CommentStatus, status: input.status as CommentStatus },
    bus,
  );
}
/** 批量删除后台评论。 */
export function destroyComments(repository: CommentCommandRepository, ids: string[]) { return repository.destroy(ids); }
/** 创建公开评论并触发异步通知。 */
export async function createComment(
  repository: CommentCommandRepository,
  headers: Headers,
  input: PublicCommentInput & { captchaToken?: string },
  validateCaptcha: (token?: string) => Promise<void>,
  notify: (commentId: string, parentId?: string | null) => Promise<Parameters<typeof toPublicComment>[0]>,
) {
  const { captchaToken, ...comment } = input;
  await validateCaptcha(captchaToken);
  const created = await repository.create(headers, comment);
  const currentComment = await notify(created.id, comment.parentId);
  return toPublicComment(currentComment);
}
