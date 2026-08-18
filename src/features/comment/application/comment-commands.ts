import "server-only";

import { eq, inArray, type InferInsertModel } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { validateCaptcha } from "@/packages/infrastructure/security/validate-captcha";
import { CommentStatus } from "@/packages/domain/content/comment";
import { notifyCommentCreated } from "./notifications/comment-delivery";
import { toPublicComment } from "./comment-dto";
import {
  assertCommentParentMatches,
  assertPublicCommentTarget,
} from "./comment-target";

/** 更新后台评论内容或状态。 */
export async function updateComment(
  db: Database,
  input: { id: string } & Partial<InferInsertModel<typeof schema.comment>>,
) {
  const { id, ...changes } = input;
  const [updated] = await observeDbOperation(
    "comment.service.update",
    "update",
    () =>
      db
        .update(schema.comment)
        .set(changes)
        .where(eq(schema.comment.id, id))
        .returning(),
  );
  return updated;
}

/** 批量删除后台评论。 */
export async function destroyComments(db: Database, ids: string[]) {
  await observeDbOperation("comment.service.destroy", "delete", () =>
    db.delete(schema.comment).where(inArray(schema.comment.id, ids)),
  );
  return { success: true as const };
}

/** 创建公开评论并触发异步通知。 */
export async function createComment(
  db: Database,
  headers: Headers,
  input: {
    captchaToken?: string;
    author: string;
    content: string;
    email: string;
    site?: string | null;
    parentId?: string | null;
    postId?: string | null;
    pageId?: string | null;
    customId?: string | null;
  },
) {
  const { captchaToken, ...comment } = input;
  await validateCaptcha(captchaToken);
  await assertPublicCommentTarget(db, comment);
  if (comment.parentId)
    await assertCommentParentMatches(db, comment.parentId, comment);
  const [created] = await observeDbOperation(
    "comment.service.create",
    "insert",
    () =>
      db
        .insert(schema.comment)
        .values({
          ...comment,
          ip: headers.get("x-forwarded-for") ?? null,
          userAgent: headers.get("user-agent") ?? null,
          status: CommentStatus.PUBLISH,
        })
        .returning(),
  );
  const currentComment = await notifyCommentCreated(
    db,
    created.id,
    comment.parentId,
  );
  return toPublicComment(currentComment);
}
