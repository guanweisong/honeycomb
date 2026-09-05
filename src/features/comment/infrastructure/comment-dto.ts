import md5 from "md5";
import { CommentStatus } from "@/packages/domain/content/comment";
import { parseEnumValue } from "@/packages/infrastructure/db/value-validation";
import type { InferSelectModel } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";

type PublicCommentSource = Pick<
  InferSelectModel<typeof schema.comment>,
  | "id"
  | "author"
  | "content"
  | "site"
  | "email"
  | "parentId"
  | "status"
  | "createdAt"
>;
export function parseCommentStatus(status: unknown): CommentStatus | null {
  return status === null
    ? null
    : parseEnumValue(status, Object.values(CommentStatus), "comment.status");
}
/** 将评论转换为不暴露邮箱的公共数据。 */
export function toPublicComment(comment: PublicCommentSource) {
  return {
    id: comment.id.toString(),
    author: comment.author,
    content: comment.content,
    site: comment.site,
    parentId: comment.parentId,
    status: parseCommentStatus(comment.status),
    createdAt: comment.createdAt,
    avatar: `https://cravatar.cn/avatar/${md5(comment.email.trim().toLowerCase())}?s=48&d=identicon`,
  };
}

import type { CommentRecord } from "../application/repository";

export function toCommentRecord(
  comment: typeof schema.comment.$inferSelect,
): CommentRecord {
  return {
    id: comment.id,
    author: comment.author,
    content: comment.content,
    site: comment.site,
    email: comment.email,
    parentId: comment.parentId,
    postId: comment.postId,
    pageId: comment.pageId,
    customId: comment.customId,
    status: parseCommentStatus(comment.status),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    userAgent: comment.userAgent,
    ip: comment.ip,
  };
}
