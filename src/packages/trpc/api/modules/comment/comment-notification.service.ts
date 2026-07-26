import "server-only";

import { eq } from "drizzle-orm";
import type { Database } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import { selectAllColumns } from "@/packages/trpc/api/utils/selectAllColumns";
import { sendEmail } from "@/packages/trpc/api/utils/sendEmail";

const commentNotificationSelection = {
  ...selectAllColumns(schema.comment),
  post: { id: schema.post.id, title: schema.post.title },
  page: { id: schema.page.id, title: schema.page.title },
};

async function getNotificationComment(db: Database, id: string) {
  const [comment] = await db
    .select(commentNotificationSelection)
    .from(schema.comment)
    .leftJoin(schema.post, eq(schema.comment.postId, schema.post.id))
    .leftJoin(schema.page, eq(schema.comment.pageId, schema.page.id))
    .where(eq(schema.comment.id, id));
  return comment;
}

export async function notifyCommentCreated(
  db: Database,
  commentId: string,
  parentId?: string | null,
) {
  const currentComment = await getNotificationComment(db, commentId);
  const [setting] = await db.select().from(schema.setting);

  if (!currentComment || !setting) {
    throw new Error("Comment or setting not found");
  }

  sendEmail("ADMIN_NOTICE", { setting, currentComment }).catch((error) =>
    console.error("Failed to send admin email:", error),
  );

  if (parentId) {
    const parentComment = await getNotificationComment(db, parentId);
    if (parentComment) {
      sendEmail("REPLY_NOTICE", {
        setting,
        currentComment,
        parentComment,
      }).catch((error) => console.error("Failed to send reply email:", error));
    }
  }

  return currentComment;
}
