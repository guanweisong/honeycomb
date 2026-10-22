import type {
  NotificationComment,
  NotificationSetting,
} from "@/features/comment/types/comment.notification";
import "server-only";
import { toCommentRecord } from "./comment-dto";

import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { selectAllColumns } from "@/lib/db/query/select-all-columns";
import { observeDbOperation } from "@/lib/observability/server";
import { assembleLocalizedField } from "@/lib/db/translation-values";

const selection = {
  ...selectAllColumns(schema.comment),
  post: { id: schema.post.id },
  page: { id: schema.page.id },
};

export function createCommentNotificationRepository(db: Database) {
  return {
    async getComment(id: string): Promise<NotificationComment | undefined> {
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
          ? db
              .select({
                locale: schema.postTranslation.locale,
                title: schema.postTranslation.title,
              })
              .from(schema.postTranslation)
              .where(eq(schema.postTranslation.postId, comment.post.id))
          : Promise.resolve([]),
        comment.page
          ? db
              .select({
                locale: schema.pageTranslation.locale,
                title: schema.pageTranslation.title,
              })
              .from(schema.pageTranslation)
              .where(eq(schema.pageTranslation.pageId, comment.page.id))
          : Promise.resolve([]),
      ]);
      return {
        ...toCommentRecord(comment),
        post: comment.post
          ? {
              id: comment.post.id,
              title: assembleLocalizedField(
                postTranslations,
                (row) => row.title,
              ),
            }
          : null,
        page: comment.page
          ? {
              id: comment.page.id,
              title: assembleLocalizedField(
                pageTranslations,
                (row) => row.title,
              ),
            }
          : null,
      };
    },
    async getSetting(): Promise<NotificationSetting | undefined> {
      const [setting] = await observeDbOperation(
        "comment.notification.setting",
        "select",
        () =>
          db
            .select()
            .from(schema.setting)
            .where(eq(schema.setting.singletonKey, 1))
            .limit(1),
      );
      if (!setting) return undefined;
      const translations = await db
        .select()
        .from(schema.settingTranslation)
        .where(eq(schema.settingTranslation.settingId, setting.id));
      return {
        siteName: assembleLocalizedField(translations, (row) => row.siteName),
      };
    },
  };
}

export type CommentNotificationRepository = ReturnType<
  typeof createCommentNotificationRepository
>;
