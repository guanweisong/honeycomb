import "server-only";

import { eq } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { selectAllColumns } from "@/packages/infrastructure/db/query/select-all-columns";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

import type { CommentNotificationRepository, NotificationComment, NotificationSetting } from "../repository";
export type { CommentNotificationRepository, NotificationComment, NotificationSetting } from "../repository";

const selection = {
  ...selectAllColumns(schema.comment),
  post: { id: schema.post.id, title: schema.post.title },
  page: { id: schema.page.id, title: schema.page.title },
};

export function createCommentNotificationRepository(db: Database): CommentNotificationRepository {
  return {
    async getComment(id) {
      const [comment] = await observeDbOperation("comment.notification.detail", "select", () =>
        db.select(selection).from(schema.comment)
          .leftJoin(schema.post, eq(schema.comment.postId, schema.post.id))
          .leftJoin(schema.page, eq(schema.comment.pageId, schema.page.id))
          .where(eq(schema.comment.id, id)),
      );
      return comment as unknown as NotificationComment | undefined;
    },
    async getSetting() {
      const [setting] = await observeDbOperation("comment.notification.setting", "select", () => db.select().from(schema.setting));
      return setting as NotificationSetting | undefined;
    },
  };
}
