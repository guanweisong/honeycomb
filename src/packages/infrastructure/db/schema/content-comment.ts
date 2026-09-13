import { CommentStatus } from "@/packages/domain/content/comment";
import {
  sqliteTable,
  text,
  index,
  foreignKey,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { objectId } from "../object-id";
import { withTimestamps } from "../timestamps";
import { post } from "./content-post";
import { page } from "./content-page";
import { enumCheck } from "../constraint-helpers";

/**
 * 评论表 (comment)
 * 存储针对文章、页面或其他内容的评论。
 */
export const comment = sqliteTable(
  "comment",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    userAgent: text("user_agent"), // 评论者的 User Agent
    author: text("author").notNull(), // 评论者昵称
    content: text("content").notNull(), // 评论内容
    site: text("site"), // 评论者网址
    email: text("email").notNull(), // 评论者邮箱
    ip: text("ip"), // 评论者IP地址
    parentId: text("parent_id"), // 父评论ID，用于实现嵌套评论
    postId: text("post_id").references(() => post.id, { onDelete: "cascade" }), // 关联的文章ID
    pageId: text("page_id").references(() => page.id, { onDelete: "cascade" }), // 关联的页面ID
    customId: text("custom_id"), // 关联的自定义实体ID
    status: text("status").default(CommentStatus.PUBLISH), // 评论状态，默认发布
    ...withTimestamps(),
  },
  (table) => ({
    commentParentFk: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    commentPostStatusCreatedIdx: index("comment_post_status_created_idx").on(
      table.postId,
      table.status,
      table.createdAt,
    ),
    commentPageStatusCreatedIdx: index("comment_page_status_created_idx").on(
      table.pageId,
      table.status,
      table.createdAt,
    ),
    commentCustomStatusCreatedIdx: index(
      "comment_custom_status_created_idx",
    ).on(table.customId, table.status, table.createdAt),
    commentParentIdx: index("comment_parent_idx").on(table.parentId),
    commentStatusCheck: enumCheck(
      "comment_status_check",
      table.status,
      Object.values(CommentStatus),
    ),
    commentTargetCheck: check(
      "comment_target_check",
      sql`(${table.postId} is not null) + (${table.pageId} is not null) + (${table.customId} is not null) = 1`,
    ),
  }),
);
