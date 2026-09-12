import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PageStatus } from "@/packages/domain/content/page";
import { PostType } from "@/packages/domain/content/post";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { CommentStatus } from "@/packages/domain/content/comment";
import { MultiLangEnum } from "@/packages/domain/localization/i18n";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  foreignKey,
  check,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { objectId } from "../object-id";
import { withTimestamps } from "../timestamps";
import { user } from "./auth";
import { enumCheck } from "../constraint-helpers";
import { MenuType } from "@/packages/domain/navigation/menu";
import { TagType } from "@/packages/domain/content/tag";

export const category = sqliteTable(
  "category",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    parent: text("parent"), // 父分类ID，用于构建层级关系
    status: text("status").default(EnableStatus.ENABLE).notNull(), // 分类状态，默认启用
    path: text("path").notNull(), // 分类的访问路径/slug
    ...withTimestamps(),
  },
  (table) => ({
    categoryParentFk: foreignKey({
      columns: [table.parent],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    categoryPathIdx: uniqueIndex("category_path_idx").on(table.path),
    categoryStatusIdx: index("category_status_idx").on(table.status),
    categoryParentIdx: index("category_parent_idx").on(table.parent),
    categoryStatusCheck: enumCheck(
      "category_status_check",
      table.status,
      Object.values(EnableStatus),
    ),
  }),
);

export const categoryTranslation = sqliteTable(
  "category_translation",
  {
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    locale: text("locale").$type<MultiLangEnum>().notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
  },
  (table) => ({
    categoryLocalePk: primaryKey({ columns: [table.categoryId, table.locale] }),
    categoryLocaleCheck: check(
      "category_translation_locale_check",
      sql`${table.locale} in ('zh', 'en')`,
    ),
  }),
);
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
    postLocaleCheck: check(
      "post_translation_locale_check",
      sql`${table.locale} in ('zh', 'en')`,
    ),
  }),
);

/**
 * 独立页面表 (page)
 * 存储独立的、非文章性质的页面，如 "关于我"、"联系方式" 等。
 */
export const page = sqliteTable(
  "page",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "no action" }), // 作者ID
    status: text("status").default(PageStatus.TO_AUDIT).notNull(), // 页面状态，默认待审核
    template: text("template").default(PageTemplate.DEFAULT).notNull(), // 页面模板
    views: integer("views").default(0).notNull(), // 浏览次数
    ...withTimestamps(),
  },
  (table) => ({
    pageStatusTemplateCreatedIdx: index("page_status_template_created_idx").on(
      table.status,
      table.template,
      table.createdAt,
    ),
    pageAuthorCreatedIdx: index("page_author_created_idx").on(
      table.authorId,
      table.createdAt,
    ),
    pageStatusCheck: enumCheck(
      "page_status_check",
      table.status,
      Object.values(PageStatus),
    ),
    pageTemplateCheck: enumCheck(
      "page_template_check",
      table.template,
      Object.values(PageTemplate),
    ),
    pageViewsCheck: check("page_views_check", sql`${table.views} >= 0`),
  }),
);

export const pageTranslation = sqliteTable(
  "page_translation",
  {
    pageId: text("page_id")
      .notNull()
      .references(() => page.id, { onDelete: "cascade" }),
    locale: text("locale").$type<MultiLangEnum>().notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
  },
  (table) => ({
    pageLocalePk: primaryKey({ columns: [table.pageId, table.locale] }),
    pageLocaleCheck: check(
      "page_translation_locale_check",
      sql`${table.locale} in ('zh', 'en')`,
    ),
  }),
);

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

/**
 * 媒体文件表 (media)
 * 存储上传的图片、视频等媒体文件信息。
 */
export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    key: text("key").notNull(), // 文件在对象存储中的 key
    name: text("name").notNull(), // 文件名
    size: integer("size").notNull(), // 文件大小 (字节)
    type: text("type").notNull(), // 文件 MIME 类型
    url: text("url").notNull(), // 文件的访问 URL
    color: text("color"), // 图片主色调
    height: integer("height"), // 图片高度
    width: integer("width"), // 图片宽度
    ...withTimestamps(),
  },
  (table) => ({
    mediaKeyIdx: index("media_key_idx").on(table.key),
    mediaCreatedIdx: index("media_created_idx").on(table.createdAt),
    mediaSizeCheck: check("media_size_check", sql`${table.size} >= 0`),
    mediaHeightCheck: check(
      "media_height_check",
      sql`${table.height} is null or ${table.height} >= 0`,
    ),
    mediaWidthCheck: check(
      "media_width_check",
      sql`${table.width} is null or ${table.width} >= 0`,
    ),
  }),
);

/**
 * 网站设置表 (setting)
 * 存储全局的网站配置信息。
 */
export const setting = sqliteTable(
  "setting",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    singletonKey: integer("singleton_key").default(1).notNull(),
    siteRecordNo: text("site_record_no"), // 网站备案号
    siteRecordUrl: text("site_record_url"), // 备案号链接
    ...withTimestamps(),
  },
  (table) => ({
    settingSingletonCheck: check(
      "setting_singleton_check",
      sql`${table.singletonKey} = 1`,
    ),
    settingSingletonIdx: uniqueIndex("setting_singleton_idx").on(
      table.singletonKey,
    ),
  }),
);

export const settingTranslation = sqliteTable(
  "setting_translation",
  {
    settingId: text("setting_id")
      .notNull()
      .references(() => setting.id, { onDelete: "cascade" }),
    locale: text("locale").$type<MultiLangEnum>().notNull(),
    siteName: text("site_name"),
    siteSubName: text("site_sub_name"),
    siteSignature: text("site_signature"),
    siteCopyright: text("site_copyright"),
  },
  (table) => ({
    settingLocalePk: primaryKey({ columns: [table.settingId, table.locale] }),
    settingLocaleCheck: check(
      "setting_translation_locale_check",
      sql`${table.locale} in ('zh', 'en')`,
    ),
  }),
);

/**
 * 菜单表 (menu)
 * 存储网站导航菜单的结构。
 */
export const menu = sqliteTable(
  "menu",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    parent: text("parent"), // 父菜单项ID
    categoryId: text("category_id").references(() => category.id, {
      onDelete: "set null",
    }), // 关联分类ID
    pageId: text("page_id").references(() => page.id, {
      onDelete: "cascade",
    }), // 关联页面ID
    customId: text("custom_id"), // 关联自定义实体ID
    power: integer("power").notNull(), // 排序权重
    type: text("type").notNull(), // 菜单项类型 (CATEGORY, PAGE, CUSTOM)
    ...withTimestamps(),
  },
  (table) => ({
    menuParentFk: foreignKey({
      columns: [table.parent],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    menuParentIdx: index("menu_parent_idx").on(table.parent),
    menuPowerIdx: index("menu_power_idx").on(table.power),
    menuTypeIdx: index("menu_type_idx").on(table.type),
    menuTypeCheck: enumCheck(
      "menu_type_check",
      table.type,
      Object.values(MenuType),
    ),
  }),
);

/**
 * 标签表 (tag)
 * 存储用于标记文章的标签。
 */
export const tag = sqliteTable("tag", {
  id: text("id").primaryKey().$defaultFn(objectId),
  ...withTimestamps(),
});

export const tagTranslation = sqliteTable(
  "tag_translation",
  {
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    locale: text("locale").$type<MultiLangEnum>().notNull(),
    name: text("name").notNull(),
  },
  (table) => ({
    tagLocalePk: primaryKey({ columns: [table.tagId, table.locale] }),
    tagLocaleCheck: check(
      "tag_translation_locale_check",
      sql`${table.locale} in ('zh', 'en')`,
    ),
  }),
);

/**
 * 文章-标签中间表 (post_tag)
 * 存储文章与标签的多对多关系。
 */
export const postTag = sqliteTable(
  "post_tag",
  {
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 标签类型：ACTOR, DIRECTOR, MOVIE_STYLE, GALLERY_STYLE
  },
  (table) => ({
    postTagUniqueIdx: uniqueIndex("post_tag_post_tag_type_unique").on(
      table.postId,
      table.tagId,
      table.type,
    ),
    postTagIdx: index("post_tag_post_tag_idx").on(table.postId, table.tagId),
    postTagTagTypeIdx: index("post_tag_tag_type_idx").on(
      table.tagId,
      table.type,
    ),
    postTagTypeCheck: enumCheck(
      "post_tag_type_check",
      table.type,
      Object.values(TagType),
    ),
  }),
);

/**
 * 友情链接表 (link)
 * 存储友情链接信息。
 */
export const link = sqliteTable(
  "link",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    url: text("url").unique().notNull(),
    name: text("name").notNull(),
    logo: text("logo").notNull(), // 链接 Logo URL
    description: text("description"),
    status: text("status").default(EnableStatus.ENABLE), // 链接状态，默认启用
    ...withTimestamps(),
  },
  (table) => ({
    linkStatusIdx: index("link_status_idx").on(table.status),
    linkStatusCheck: enumCheck(
      "link_status_check",
      table.status,
      Object.values(EnableStatus),
    ),
  }),
);
