import md5 from "md5";
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

/** 将数据库评论转换为不暴露敏感字段的公共 DTO。 */
export function toPublicComment(comment: PublicCommentSource) {
  return {
    id: comment.id.toString(),
    author: comment.author,
    content: comment.content,
    site: comment.site,
    parentId: comment.parentId,
    status: comment.status,
    createdAt: comment.createdAt,
    avatar: `https://cravatar.cn/avatar/${md5(
      comment.email.trim().toLowerCase(),
    )}?s=48&d=identicon`,
  };
}
