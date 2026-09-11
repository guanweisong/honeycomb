import "server-only";
import { sendCommentEmail } from "./comment-email";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";
import { getLogger } from "@/packages/infrastructure/observability/server";
import type { CommentNotificationRepository } from "../application/repository";

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

function logEmailDeliveryFailure(operation: string, error: unknown) {
  getLogger().error(LogEvent.externalServiceOperation, {
    service: "email",
    operation,
    outcome: "error",
    errorType: errorType(error),
  });
}

function settleEmailDelivery(
  operation: string,
  send: () => Promise<void>,
): Promise<void> {
  return Promise.resolve()
    .then(send)
    .catch((error: unknown) => {
      logEmailDeliveryFailure(operation, error);
    });
}

/** 编排新评论的管理员通知和回复通知。邮件失败只记录日志，不阻断评论写入。 */
export async function notifyCommentCreated(
  repository: CommentNotificationRepository,
  commentId: string,
  parentId?: string | null,
) {
  const currentComment = await repository.getComment(commentId);
  const setting = await repository.getSetting();
  if (!currentComment || !setting)
    throw new Error("Comment or setting not found");

  const deliveries = [
    settleEmailDelivery("send-admin-notification", () =>
      sendCommentEmail("ADMIN_NOTICE", { setting, currentComment }),
    ),
  ];
  let preparationError: unknown;
  if (parentId) {
    try {
      const parentComment = await repository.getComment(parentId);
      if (parentComment) {
        deliveries.push(
          settleEmailDelivery("send-reply-notification", () =>
            sendCommentEmail("REPLY_NOTICE", {
              setting,
              currentComment,
              parentComment,
            }),
          ),
        );
      }
    } catch (error) {
      preparationError = error;
    }
  }

  await Promise.all(deliveries);
  if (preparationError) throw preparationError;
}
