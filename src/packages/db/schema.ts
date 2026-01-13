import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { i18nField } from "./i18nField";
import { arrayField } from "./arrayField";
import { objectId } from "./objectId";
import { withTimestamps } from "./timestamps";

/**
 * 用户表 (user)
 * 存储系统用户信息。
 */
export const user = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(objectId),
  email: text("email").unique(),
  level: text("level").default("EDITOR").notNull(), // 用户等级，默认为编辑
  name: text("name").unique(),
  password: text("password"),
  status: text("status").default("ENABLE").notNull(), // 用户状态，默认启用
  ...withTimestamps(),
});

/**
 * 分类表 (category)
 * 存储文章或其他内容的分类信息。
 */
export const category = sqliteTable("category", {
  id: text("id").primaryKey().$defaultFn(objectId),
  description: i18nField("description").notNull(), // 分类描述 (国际化)
  title: i18nField("title").notNull(), // 分类标题 (国际化)
  parent: text("parent"), // 父分类ID，用于构建层级关系
  status: text("status").default("ENABLE").notNull(), // 分类状态，默认启用
  path: text("path").notNull(), // 分类的访问路径/slug
  ...withTimestamps(),
});

/**
 * 文章表 (post)
 * 存储各类文章内容，如普通文章、电影、摄影、引言等。
 */
export const post = sqliteTable("post", {
  id: text("id").primaryKey().$defaultFn(objectId),
  commentStatus: text("comment_status").default("ENABLE").notNull(), // 评论状态，默认启用
  // --- 图库类型字段 ---
  galleryLocation: i18nField("gallery_location"), // 图库地点 (国际化)
  galleryStyleIds: arrayField<string>("gallery_style_ids"), // 图库风格ID列表
  galleryTime: text("gallery_time"), // 图库拍摄时间
  // --- 电影类型字段 ---
  movieActorIds: arrayField("movie_actor_ids"), // 电影演员ID列表
  movieDirectorIds: arrayField("movie_director_ids"), // 电影导演ID列表
  movieStyleIds: arrayField("movie_style_ids"), // 电影风格ID列表
  movieTime: text("movie_time"), // 电影上映时间
  // --- 核心字段 ---
  authorId: text("author_id").notNull(), // 作者ID，关联到 user 表
  categoryId: text("category_id").notNull(), // 分类ID，关联到 category 表
  content: i18nField("content"), // 文章内容 (国际化)
  coverId: text("cover_id"), // 封面图ID，关联到 media 表
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
  authorId: text("author_id").notNull(), // 作者ID
  content: i18nField("content").notNull(), // 页面内容 (国际化)
  status: text("status").default("TO_AUDIT").notNull(), // 页面状态，默认待审核
  title: i18nField("title").notNull(), // 页面标题 (国际化)
  views: integer("views").default(0).notNull(), // 浏览次数
  ...withTimestamps(),
});

/**
 * 评论表 (comment)
 * 存储针对文章、页面或其他内容的评论。
 */
export const comment = sqliteTable("comment", {
  id: text("id").primaryKey().$defaultFn(objectId),
  userAgent: text("user_agent"), // 评论者的 User Agent
  author: text("author").notNull(), // 评论者昵称
  content: text("content").notNull(), // 评论内容
  site: text("site"), // 评论者网址
  email: text("email").notNull(), // 评论者邮箱
  ip: text("ip"), // 评论者IP地址
  parentId: text("parent_id"), // 父评论ID，用于实现嵌套评论
  postId: text("post_id"), // 关联的文章ID
  pageId: text("page_id"), // 关联的页面ID
  customId: text("custom_id"), // 关联的自定义实体ID
  status: text("status").default("PUBLISH"), // 评论状态，默认发布
  ...withTimestamps(),
});

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
 * Token 表 (token)
 * 存储用于特定目的的令牌，例如 API 访问令牌。
 */
export const token = sqliteTable("token", {
  id: text("id").primaryKey().$defaultFn(objectId),
  content: text("content").unique(), // Token 内容
  userId: text("user_id"), // 关联的用户ID
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
export const menu = sqliteTable("menu", {
  id: text("id").primaryKey().$defaultFn(objectId),
  parent: text("parent"), // 父菜单项ID
  power: integer("power").notNull(), // 排序权重
  type: text("type").notNull(), // 菜单项类型 (CATEGORY, PAGE, CUSTOM)
  ...withTimestamps(),
});

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
