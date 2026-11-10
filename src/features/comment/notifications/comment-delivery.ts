import type { CommentNotificationRepository } from "@/features/comment/server/comment-notification-repository";
import "server-only";
import { sendCommentEmail } from "@/features/comment/notifications/comment-email";
import { LogEvent } from "@/lib/observability/core/names";
import { getLogger } from "@/lib/observability/server";

function errorType(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

/** 记录通知编排失败；仅保留固定字段和错误类型，避免泄露评论及用户数据。 */
export function logCommentNotificationFailure(error: unknown) {
  getLogger().error(LogEvent.externalServiceOperation, {
    service: "email",
    operation: "prepare-comment-notification",
    outcome: "error",
    errorType: errorType(error),
  });
}

/** 编排新评论的管理员通知。邮件失败只记录日志，不阻断评论写入。 */
export async function notifyCommentCreated(
  repository: CommentNotificationRepository,
  commentId: string,
) {
  const [currentComment, setting] = await Promise.all([
    repository.getComment(commentId),
    repository.getSetting(),
  ]);
  if (!currentComment || !setting)
    throw new Error("Comment or setting not found");

  // 评论邮箱来自公开表单，尚无收件人所有权验证。
  try {
    await sendCommentEmail({ setting, currentComment });
  } catch (error) {
    getLogger().error(LogEvent.externalServiceOperation, {
      service: "email",
      operation: "send-admin-notification",
      outcome: "error",
      errorType: errorType(error),
    });
  }
}
