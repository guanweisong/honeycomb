import {
  sqliteTable,
  text,
  integer,
  index,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { i18nField } from "./i18nField";
import { objectId } from "./objectId";
import { withTimestamps } from "./timestamps";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { UserStatus } from "@/packages/trpc/api/modules/user/types/user.status";

const userLevels = [
  UserLevel.ADMIN,
  UserLevel.EDITOR,
  UserLevel.GUEST,
] as const;

const userStatuses = [
  UserStatus.DELETED,
  UserStatus.ENABLE,
  UserStatus.DISABLE,
] as const;

/**
 * 用户表 (user)
 * 存储系统用户信息。
 */
export const user = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(objectId),
  email: text("email").unique(),
  level: text("level", { enum: userLevels })
    .default(UserLevel.GUEST)
    .notNull(), // 用户等级，默认为访客
  name: text("name").unique(),
  password: text("password"),
  status: text("status", { enum: userStatuses })
    .default(UserStatus.ENABLE)
    .notNull(), // 用户状态，默认启用
  ...withTimestamps(),
});

/**
 * 分类表 (category)
 * 存储文章或其他内容的分类信息。
 */
export const category = sqliteTable(
  "category",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    description: i18nField("description").notNull(), // 分类描述 (国际化)
    title: i18nField("title").notNull(), // 分类标题 (国际化)
    parent: text("parent"), // 父分类ID，用于构建层级关系
    status: text("status").default("ENABLE").notNull(), // 分类状态，默认启用
    path: text("path").notNull(), // 分类的访问路径/slug
    ...withTimestamps(),
  },
  (table) => ({
    categoryParentFk: foreignKey({
      columns: [table.parent],
      foreignColumns: [table.id],
    }).onDelete("set null"),
  }),
);

/**
 * 文章表 (post)
 * 存储各类文章内容，如普通文章、电影、摄影、引言等。
 */
export const post = sqliteTable("post", {
  id: text("id").primaryKey().$defaultFn(objectId),
  commentStatus: text("comment_status").default("ENABLE").notNull(), // 评论状态，默认启用
  // --- 图库类型字段 ---
  galleryLocation: i18nField("gallery_location"), // 图库地点 (国际化)
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
  content: i18nField("content"), // 文章内容 (国际化)
  coverId: text("cover_id").references(() => media.id, { onDelete: "set null" }), // 封面图ID，关联到 media 表
  excerpt: i18nField("excerpt"), // 文章摘要 (国际化)
  status: text("status").default("TO_AUDIT").notNull(), // 文章状态，默认待审核
  title: i18nField("title"), // 文章标题 (国际化)
  type: text("type").default("ARTICLE").notNull(), // 文章类型，默认普通文章
  views: integer("views").default(0), // 浏览次数
  // --- 引言类型字段 ---
  quoteAuthor: i18nField("quote_author"), // 引言作者 (国际化)
  quoteContent: i18nField("quote_content"), // 引言内容 (国际化)
  ...withTimestamps(),
});

/**
 * 独立页面表 (page)
 * 存储独立的、非文章性质的页面，如 "关于我"、"联系方式" 等。
 */
export const page = sqliteTable("page", {
  id: text("id").primaryKey().$defaultFn(objectId),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "no action" }), // 作者ID
  content: i18nField("content").notNull(), // 页面内容 (国际化)
  status: text("status").default("TO_AUDIT").notNull(), // 页面状态，默认待审核
  template: text("template").default("default").notNull(), // 页面模板
  title: i18nField("title").notNull(), // 页面标题 (国际化)
  views: integer("views").default(0).notNull(), // 浏览次数
  ...withTimestamps(),
});

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
    status: text("status").default("PUBLISH"), // 评论状态，默认发布
    ...withTimestamps(),
  },
  (table) => ({
    commentParentFk: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
  }),
);

/**
 * 媒体文件表 (media)
 * 存储上传的图片、视频等媒体文件信息。
 */
export const media = sqliteTable("media", {
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
});

/**
 * 网站设置表 (setting)
 * 存储全局的网站配置信息。
 */
export const setting = sqliteTable("setting", {
  id: text("id").primaryKey().$defaultFn(objectId),
  siteName: i18nField("site_name").notNull(), // 网站主名称 (国际化)
  siteSubName: i18nField("site_sub_name").notNull(), // 网站副名称 (国际化)
  siteSignature: i18nField("site_signature").notNull(), // 网站签名 (国际化)
  siteCopyright: i18nField("site_copyright").notNull(), // 网站版权信息 (国际化)
  siteRecordNo: text("site_record_no"), // 网站备案号
  siteRecordUrl: text("site_record_url"), // 备案号链接
  ...withTimestamps(),
});

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
      onDelete: "set null",
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
  }),
);

/**
 * 标签表 (tag)
 * 存储用于标记文章的标签。
 */
export const tag = sqliteTable("tag", {
  id: text("id").primaryKey().$defaultFn(objectId),
  name: i18nField("name").notNull(), // 标签名称 (国际化)
  ...withTimestamps(),
});

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
    postTagIdx: index("post_tag_post_tag_idx").on(table.postId, table.tagId),
  }),
);

/**
 * 友情链接表 (link)
 * 存储友情链接信息。
 */
export const link = sqliteTable("link", {
  id: text("id").primaryKey().$defaultFn(objectId),
  url: text("url").unique().notNull(),
  name: text("name").notNull(),
  logo: text("logo").notNull(), // 链接 Logo URL
  description: text("description"),
  status: text("status").default("ENABLE"), // 链接状态，默认启用
  ...withTimestamps(),
});

/**
 * 用户实体关系定义。
 * 用于 Drizzle relational query（`db.query.*.findMany({ with: ... })`）
 * 在查询用户时可关联其文章与独立页面。
 */
export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
  pages: many(page),
}));

/**
 * 分类实体关系定义。
 * - `posts`: 分类下的文章列表
 * - `parentItem/children`: 分类自引用的父子层级关系
 */
export const categoryRelations = relations(category, ({ many, one }) => ({
  posts: many(post),
  parentItem: one(category, {
    fields: [category.parent],
    references: [category.id],
    relationName: "category_parent",
  }),
  children: many(category, {
    relationName: "category_parent",
  }),
}));

/**
 * 媒体实体关系定义。
 * 用于关联“被哪篇文章作为封面使用”。
 */
export const mediaRelations = relations(media, ({ many }) => ({
  coverPosts: many(post),
}));

/**
 * 文章实体关系定义。
 * 为文章提供作者、分类、封面以及 post_tag 中间表关联能力。
 */
export const postRelations = relations(post, ({ one, many }) => ({
  author: one(user, {
    fields: [post.authorId],
    references: [user.id],
  }),
  category: one(category, {
    fields: [post.categoryId],
    references: [category.id],
  }),
  cover: one(media, {
    fields: [post.coverId],
    references: [media.id],
  }),
  postTags: many(postTag),
}));

/**
 * 标签实体关系定义。
 * 通过 post_tag 中间表关联到文章。
 */
export const tagRelations = relations(tag, ({ many }) => ({
  postTags: many(postTag),
}));

/**
 * 文章-标签中间表关系定义。
 * 同时关联 `post` 与 `tag`，用于多对多关系查询。
 */
export const postTagRelations = relations(postTag, ({ one }) => ({
  post: one(post, {
    fields: [postTag.postId],
    references: [post.id],
  }),
  tag: one(tag, {
    fields: [postTag.tagId],
    references: [tag.id],
  }),
}));

/**
 * 独立页面实体关系定义。
 * 为页面提供作者关联能力。
 */
export const pageRelations = relations(page, ({ one, many }) => ({
  author: one(user, {
    fields: [page.authorId],
    references: [user.id],
  }),
  comments: many(comment),
}));

/**
 * 评论实体关系定义。
 * 为评论提供文章、页面、父评论及子评论关联能力。
 */
export const commentRelations = relations(comment, ({ one, many }) => ({
  post: one(post, {
    fields: [comment.postId],
    references: [post.id],
  }),
  page: one(page, {
    fields: [comment.pageId],
    references: [page.id],
  }),
  parent: one(comment, {
    fields: [comment.parentId],
    references: [comment.id],
    relationName: "comment_parent",
  }),
  children: many(comment, {
    relationName: "comment_parent",
  }),
}));

/**
 * 菜单实体关系定义。
 * 提供菜单自引用父子关系。
 */
export const menuRelations = relations(menu, ({ one, many }) => ({
  parentItem: one(menu, {
    fields: [menu.parent],
    references: [menu.id],
    relationName: "menu_parent",
  }),
  children: many(menu, {
    relationName: "menu_parent",
  }),
  category: one(category, {
    fields: [menu.categoryId],
    references: [category.id],
  }),
  page: one(page, {
    fields: [menu.pageId],
    references: [page.id],
  }),
}));
