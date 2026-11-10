import "server-only";

import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailRequestOptions,
} from "resend";
import { getResendEnv } from "@/env/server";
import { LogEvent } from "@/lib/observability/core/names";
import {
  getLogger,
  observeExternalServiceOperation,
} from "@/lib/observability/server";
import AdminCommentEmailMessage from "@/features/comment/notifications/templates/AdminCommentEmailMessage";
import { CUSTOM_COMMENT_NOTIFICATION_TITLE } from "@/features/comment/notifications/comment-notification";
import type {
  CommentNotification,
  CommentNotificationSetting,
} from "@/features/comment/notifications/comment-notification";

export type {
  CommentNotification,
  CommentNotificationSetting,
} from "@/features/comment/notifications/comment-notification";

interface CommentEmailPayload {
  setting: CommentNotificationSetting;
  currentComment: CommentNotification;
}

async function sendWithDeadline(resend: Resend, payload: CreateEmailOptions) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  const options: CreateEmailRequestOptions = {
    signal: controller.signal,
  };
  try {
    return await resend.emails.send(payload, options);
  } finally {
    clearTimeout(timer);
  }
}

export async function sendCommentEmail({
  setting,
  currentComment,
}: CommentEmailPayload) {
  const resendEnv = getResendEnv();
  if (!resendEnv) throw new Error("Resend integration is not configured");

  const resend = new Resend(resendEnv.apiKey);
  const siteNameZh = setting.siteName?.zh ?? "";

  try {
    await observeExternalServiceOperation("email", "send", async () => {
      const result = await sendWithDeadline(resend, {
        from: resendEnv.fromEmail,
        to: resendEnv.adminEmail,
        subject: `[${siteNameZh}]${currentComment.customId ? CUSTOM_COMMENT_NOTIFICATION_TITLE : "有一条新的评论"}`,
        react: AdminCommentEmailMessage({ currentComment, setting }),
      });
      if (result.error) throw new Error("Email delivery failed");
      return result.data;
    });
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
