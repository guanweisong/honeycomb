import "server-only";
import { sendCommentEmail } from "./comment-email";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";
import { getLogger } from "@/packages/infrastructure/observability/server";
import type { CommentNotificationRepository } from "../../infrastructure/comment-notification-repository";

/** 编排新评论的管理员通知和回复通知。邮件失败只记录日志，不阻断评论写入。 */
export async function notifyCommentCreated(repository: CommentNotificationRepository, commentId: string, parentId?: string | null) {
  const currentComment = await repository.getComment(commentId);
  const setting = await repository.getSetting();
  if (!currentComment || !setting) throw new Error("Comment or setting not found");
  sendCommentEmail("ADMIN_NOTICE", { setting, currentComment }).catch((error) => getLogger().error(LogEvent.externalServiceOperation, { service: "email", operation: "send-admin-notification", outcome: "error", error }));
  if (parentId) {
    const parentComment = await repository.getComment(parentId);
    if (parentComment) sendCommentEmail("REPLY_NOTICE", { setting, currentComment, parentComment }).catch((error) => getLogger().error(LogEvent.externalServiceOperation, { service: "email", operation: "send-reply-notification", outcome: "error", error }));
  }
  return currentComment;
}
