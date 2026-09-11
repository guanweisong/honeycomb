import "server-only";
import { toCommentRecord } from "./comment-dto";

import { eq } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { selectAllColumns } from "@/packages/infrastructure/db/query/select-all-columns";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { assembleLocalizedField } from "@/packages/infrastructure/db/translation-values";

import type { CommentNotificationRepository } from "../application/repository";
export type {
  CommentNotificationRepository,
  NotificationComment,
  NotificationSetting,
} from "../application/repository";

const selection = {
  ...selectAllColumns(schema.comment),
  post: { id: schema.post.id },
  page: { id: schema.page.id },
};

export function createCommentNotificationRepository(
  db: Database,
): CommentNotificationRepository {
  return {
    async getComment(id) {
      const [comment] = await observeDbOperation(
        "comment.notification.detail",
        "select",
        () =>
          db
            .select(selection)
            .from(schema.comment)
            .leftJoin(schema.post, eq(schema.comment.postId, schema.post.id))
            .leftJoin(schema.page, eq(schema.comment.pageId, schema.page.id))
            .where(eq(schema.comment.id, id)),
      );
      if (!comment) return undefined;
      const [postTranslations, pageTranslations] = await Promise.all([
        comment.post
          ? db.select().from(schema.postTranslation).where(eq(schema.postTranslation.postId, comment.post.id))
          : Promise.resolve([]),
        comment.page
          ? db.select().from(schema.pageTranslation).where(eq(schema.pageTranslation.pageId, comment.page.id))
          : Promise.resolve([]),
      ]);
      return {
        ...toCommentRecord(comment),
        post: comment.post
          ? { id: comment.post.id, title: assembleLocalizedField(postTranslations, (row) => row.title) }
          : null,
        page: comment.page
          ? { id: comment.page.id, title: assembleLocalizedField(pageTranslations, (row) => row.title) }
          : null,
      };
    },
    async getSetting() {
      const [setting] = await observeDbOperation(
        "comment.notification.setting",
        "select",
        () => db.select().from(schema.setting),
      );
      if (!setting) return undefined;
      const translations = await db
        .select()
        .from(schema.settingTranslation)
        .where(eq(schema.settingTranslation.settingId, setting.id));
      return { siteName: assembleLocalizedField(translations, (row) => row.siteName) };
    },
  };
}
