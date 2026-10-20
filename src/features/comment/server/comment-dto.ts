import { CommentStatus } from "@/features/comment/comment-status";
import { parseEnumValue } from "@/lib/db/value-validation";
import * as schema from "@/lib/db/schema";
import type { PublicCommentSource } from "./comment-public-dto";
export function parseCommentStatus(status: unknown): CommentStatus | null {
  return status === null
    ? null
    : parseEnumValue(status, Object.values(CommentStatus), "comment.status");
}
import type { CommentRecord } from "../types";

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

export function toPublicCommentSource(
  comment: Pick<
    typeof schema.comment.$inferSelect,
    | "id"
    | "author"
    | "content"
    | "site"
    | "email"
    | "parentId"
    | "status"
    | "createdAt"
  >,
): PublicCommentSource {
  return {
    id: comment.id,
    author: comment.author,
    content: comment.content,
    site: comment.site,
    email: comment.email,
    parentId: comment.parentId,
    status: parseCommentStatus(comment.status),
    createdAt: comment.createdAt,
  };
}
