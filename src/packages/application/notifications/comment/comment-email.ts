import "server-only";

import { Resend } from "resend";
import { getResendEnv } from "@/env/server";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";
import {
  getLogger,
  observeExternalServiceOperation,
} from "@/packages/infrastructure/observability/server";
import AdminCommentEmailMessage from "./templates/AdminCommentEmailMessage";
import ReplyCommentEmailMessage from "./templates/ReplyCommentEmailMessage";
import type {
  CommentNotification,
  CommentNotificationSetting,
} from "./comment-notification";

export type { CommentNotification, CommentNotificationSetting } from "./comment-notification";

type CommentEmailType = "ADMIN_NOTICE" | "REPLY_NOTICE";

interface CommentEmailPayload {
  setting: CommentNotificationSetting;
  currentComment: CommentNotification;
  parentComment?: CommentNotification;
}

export async function sendCommentEmail(
  type: CommentEmailType,
  payload: CommentEmailPayload,
) {
  const resendEnv = getResendEnv();
  if (!resendEnv) throw new Error("Resend integration is not configured");

  const resend = new Resend(resendEnv.apiKey);
  const { setting, currentComment, parentComment } = payload;
  const siteNameZh = setting.siteName?.zh ?? "";

  try {
    if (type === "ADMIN_NOTICE") {
      await observeExternalServiceOperation("email", "send", async () => {
        const result = await resend.emails.send({
          from: resendEnv.fromEmail,
          to: resendEnv.adminEmail,
          subject: `[${siteNameZh}]有一条新的评论`,
          react: AdminCommentEmailMessage({ currentComment, setting }),
        });
        if (result.error) throw new Error("Email delivery failed");
        return result.data;
      });
      return;
    }

    if (parentComment?.email) {
      await observeExternalServiceOperation("email", "send", async () => {
        const result = await resend.emails.send({
          from: resendEnv.fromEmail,
          to: parentComment.email,
          subject: `您在[${siteNameZh}]的评论有新的回复`,
          react: ReplyCommentEmailMessage({
            currentComment,
            setting,
            parentComment,
          }),
        });
        if (result.error) throw new Error("Email delivery failed");
        return result.data;
      });
      return;
    }

    if (type !== "REPLY_NOTICE") throw new Error("Invalid email type");
  } catch (error) {
    getLogger().error(LogEvent.externalServiceOperation, {
      service: "email",
      operation: "send",
      outcome: "error",
      error,
    });
    throw error;
  }
}
