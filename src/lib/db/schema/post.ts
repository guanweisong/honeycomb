import { EnableStatus } from "@/lib/validation/enable-status";
import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";
import { MultiLangEnum, supportedLanguages } from "@/lib/i18n/i18n";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { objectId } from "@/lib/db/object-id";
import { withTimestamps } from "@/lib/db/timestamps";
import { user } from "@/lib/db/schema/auth";
import { category } from "@/lib/db/schema/category";
import { media } from "@/lib/db/schema/media";
import { enumCheck } from "@/lib/db/constraint-helpers";

/**
 * 文章表 (post)
 * 存储各类文章内容，如普通文章、电影、摄影、引言等。
 */
export const post = sqliteTable(
  "post",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    commentStatus: text("comment_status")
      .default(EnableStatus.ENABLE)
      .notNull(), // 评论状态，默认启用
    // --- 图库类型字段 ---
    galleryTime: text("gallery_time"), // 图库拍摄时间
    // --- 电影类型字段 ---
    movieTime: text("movie_time"), // 电影上映时间
    // --- 核心字段 ---
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "no action" }), // 作者ID，关联到 user 表
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "no action" }), // 分类ID，关联到 category 表
    coverId: text("cover_id").references(() => media.id, {
      onDelete: "set null",
    }), // 封面图ID，关联到 media 表
    status: text("status").default(PostStatus.TO_AUDIT).notNull(), // 文章状态，默认待审核
    type: text("type").default(PostType.ARTICLE).notNull(), // 文章类型，默认普通文章
    version: integer("version").default(0).notNull(),
    creationToken: text("creation_token"),
    creationInputHash: text("creation_input_hash"),
    views: integer("views").default(0), // 浏览次数
    // --- 引言类型字段 ---
    ...withTimestamps(),
  },
  (table) => ({
    postStatusCategoryCreatedIdx: index("post_status_category_created_idx").on(
      table.status,
      table.categoryId,
      table.createdAt,
    ),
    postStatusTypeCreatedIdx: index("post_status_type_created_idx").on(
      table.status,
      table.type,
      table.createdAt,
    ),
    postAuthorCreatedIdx: index("post_author_created_idx").on(
      table.authorId,
      table.createdAt,
    ),
    postAuthorCreationTokenUnique: uniqueIndex(
      "post_author_creation_token_unique",
    ).on(table.authorId, table.creationToken),
    postVersionCheck: check("post_version_check", sql`${table.version} >= 0`),
    postCoverIdx: index("post_cover_idx").on(table.coverId),
    postCommentStatusCheck: enumCheck(
      "post_comment_status_check",
      table.commentStatus,
      Object.values(EnableStatus),
    ),
    postStatusCheck: enumCheck(
      "post_status_check",
      table.status,
      Object.values(PostStatus),
    ),
    postTypeCheck: enumCheck(
      "post_type_check",
      table.type,
      Object.values(PostType),
    ),
    postViewsCheck: check("post_views_check", sql`${table.views} >= 0`),
  }),
);

export const postTranslation = sqliteTable(
  "post_translation",
  {
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    locale: text("locale").$type<MultiLangEnum>().notNull(),
    title: text("title"),
    content: text("content"),
    excerpt: text("excerpt"),
    galleryLocation: text("gallery_location"),
    quoteAuthor: text("quote_author"),
    quoteContent: text("quote_content"),
  },
  (table) => ({
    postLocalePk: primaryKey({ columns: [table.postId, table.locale] }),
    postLocaleCheck: enumCheck(
      "post_translation_locale_check",
      table.locale,
      supportedLanguages,
    ),
  }),
);
