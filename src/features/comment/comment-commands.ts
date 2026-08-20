import "server-only";

import { validateCaptcha } from "@/packages/infrastructure/security/validate-captcha";
import { toPublicComment } from "./comment-dto";
import type { CommentCommandRepository, CommentUpdate, PublicCommentInput } from "./repository";
export type { CommentUpdate, PublicCommentInput } from "./repository";

/** 更新后台评论内容或状态。 */
export function updateComment(repository: CommentCommandRepository, input: CommentUpdate) { return repository.update(input); }
/** 批量删除后台评论。 */
export function destroyComments(repository: CommentCommandRepository, ids: string[]) { return repository.destroy(ids); }
/** 创建公开评论并触发异步通知。 */
export async function createComment(
  repository: CommentCommandRepository,
  headers: Headers,
  input: PublicCommentInput & { captchaToken?: string },
  notify: (commentId: string, parentId?: string | null) => Promise<Parameters<typeof toPublicComment>[0]>,
) {
  const { captchaToken, ...comment } = input;
  await validateCaptcha(captchaToken);
  const created = await repository.create(headers, comment);
  const currentComment = await notify(created.id, comment.parentId);
  return toPublicComment(currentComment);
}
