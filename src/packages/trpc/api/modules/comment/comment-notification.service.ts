import "server-only";

import { eq } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { selectAllColumns } from "@/packages/trpc/api/utils/select-all-columns";
import { sendCommentEmail } from "@/packages/application/notifications/comment/comment-email";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";
import { getLogger, observeDbOperation } from "@/packages/infrastructure/observability/server";

const commentNotificationSelection = {
  ...selectAllColumns(schema.comment),
  post: { id: schema.post.id, title: schema.post.title },
  page: { id: schema.page.id, title: schema.page.title },
};

async function getNotificationComment(db: Database, id: string) {
  const [comment] = await observeDbOperation(
    "comment.notification.detail",
    "select",
    () =>
      db
        .select(commentNotificationSelection)
        .from(schema.comment)
        .leftJoin(schema.post, eq(schema.comment.postId, schema.post.id))
        .leftJoin(schema.page, eq(schema.comment.pageId, schema.page.id))
        .where(eq(schema.comment.id, id)),
  );
  return comment;
}

export async function notifyCommentCreated(
  db: Database,
  commentId: string,
  parentId?: string | null,
) {
  const currentComment = await getNotificationComment(db, commentId);
  const [setting] = await observeDbOperation(
    "comment.notification.setting",
    "select",
    () => db.select().from(schema.setting),
  );

  if (!currentComment || !setting) {
    throw new Error("Comment or setting not found");
  }

  sendCommentEmail("ADMIN_NOTICE", { setting, currentComment }).catch((error) => {
    getLogger().error(LogEvent.externalServiceOperation, {
      service: "email",
      operation: "send-admin-notification",
      outcome: "error",
      error,
    });
  });

  if (parentId) {
    const parentComment = await getNotificationComment(db, parentId);
    if (parentComment) {
      sendCommentEmail("REPLY_NOTICE", {
        setting,
        currentComment,
        parentComment,
      }).catch((error) => {
        getLogger().error(LogEvent.externalServiceOperation, {
          service: "email",
          operation: "send-reply-notification",
          outcome: "error",
          error,
        });
      });
    }
  }

  return currentComment;
}
