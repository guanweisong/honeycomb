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
import AdminCommentEmailMessage from "./templates/AdminCommentEmailMessage";
import ReplyCommentEmailMessage from "./templates/ReplyCommentEmailMessage";
import type {
  CommentNotification,
  CommentNotificationSetting,
} from "./comment-notification";

export type {
  CommentNotification,
  CommentNotificationSetting,
} from "./comment-notification";

type CommentEmailType = "ADMIN_NOTICE" | "REPLY_NOTICE";

interface CommentEmailPayload {
  setting: CommentNotificationSetting;
  currentComment: CommentNotification;
  parentComment?: CommentNotification;
}

async function sendWithDeadline(resend: Resend, payload: CreateEmailOptions) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  // Resend forwards request options to fetch but omits signal from its public
  // type. Keep this adaptation local and cover it with the real-SDK transport.
  const options: CreateEmailRequestOptions & Pick<RequestInit, "signal"> = {
    signal: controller.signal,
  };
  try {
    return await resend.emails.send(payload, options);
  } finally {
    clearTimeout(timer);
  }
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
        const result = await sendWithDeadline(resend, {
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
        const result = await sendWithDeadline(resend, {
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
