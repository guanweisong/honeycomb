import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { dateField } from "./dateField";
import { i18nField } from "./i18nField";
import { arrayField } from "./arrayField";

// ===== 表 schema (单数表名) =====

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  createdAt: dateField("created_at"),
  updatedAt: dateField("updated_at"),
  email: text("email").unique(),
  level: text("level").default("EDITOR"),
  name: text("name").unique(),
  password: text("password"),
  status: text("status").default("ENABLE"),
});

export const category = sqliteTable("category", {
  id: text("id").primaryKey(),
  description: i18nField("description"),
  title: i18nField("title"),
  parent: text("parent"),
  status: text("status").default("ENABLE"),
  path: text("path"),
  createdAt: dateField("created_at"),
  updatedAt: dateField("updated_at"),
});

export const post = sqliteTable("post", {
  id: text("id").primaryKey(),
  commentStatus: text("comment_status").default("ENABLE"),
  createdAt: dateField("created_at"),
  galleryLocation: i18nField("gallery_location"),
  galleryStyleIds: arrayField<string>("gallery_style_ids"),
  galleryTime: dateField("gallery_time"),
  movieActorIds: arrayField("movie_actor_ids"),
  movieDirectorIds: arrayField("movie_director_ids"),
  movieStyleIds: arrayField("movie_style_ids"),
  movieTime: dateField("movie_time"),
  authorId: text("author_id"),
  categoryId: text("category_id"),
  content: i18nField("content"),
  coverId: text("cover_id"),
  excerpt: i18nField("excerpt"),
  status: text("status").default("TO_AUDIT"),
  title: i18nField("title"),
  type: text("type").default("ARTICLE"),
  views: integer("views").default(0),
  quoteAuthor: i18nField("quote_author"),
  quoteContent: i18nField("quote_content"),
  updatedAt: dateField("updated_at"),
});

export const page = sqliteTable("page", {
  id: text("id").primaryKey(),
  createdAt: dateField("created_at"),
  authorId: text("author_id"),
  content: i18nField("content"),
  status: text("status").default("TO_AUDIT"),
  title: i18nField("title"),
  views: integer("views").default(0),
  updatedAt: dateField("updated_at"),
});

export const comment = sqliteTable("comment", {
  id: text("id").primaryKey(),
  userAgent: text("user_agent"),
  author: text("author"),
  content: text("content"),
  site: text("site"),
  email: text("email"),
  ip: text("ip"),
  parentId: text("parent_id"),
  postId: text("post_id"),
  pageId: text("page_id"),
  customId: text("custom_id"),
  status: text("status").default("PUBLISH"),
  createdAt: dateField("created_at"),
  updatedAt: dateField("updated_at"),
});

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  createdAt: dateField("created_at"),
  key: text("key"),
  name: text("name"),
  size: integer("size"),
  type: text("type"),
  url: text("url"),
  updatedAt: dateField("updated_at"),
  color: text("color"),
  height: integer("height"),
  width: integer("width"),
});

export const token = sqliteTable("token", {
  id: text("id").primaryKey(),
  content: text("content").unique(),
  userId: text("user_id"),
  createdAt: dateField("created_at"),
  updatedAt: dateField("updated_at"),
});

export const setting = sqliteTable("setting", {
  id: text("id").primaryKey(),
  siteName: i18nField("site_name"),
  siteSubName: i18nField("site_sub_name"),
  siteSignature: i18nField("site_signature"),
  siteCopyright: i18nField("site_copyright"),
  siteRecordNo: text("site_record_no"),
  siteRecordUrl: text("site_record_url"),
  updatedAt: dateField("updated_at"),
});

export const menu = sqliteTable("menu", {
  id: text("id").primaryKey(),
  createdAt: dateField("created_at"),
  parent: text("parent"),
  power: integer("power"),
  type: text("type"),
  updatedAt: dateField("updated_at"),
});

export const tag = sqliteTable("tag", {
  id: text("id").primaryKey(),
  name: i18nField("name"),
  createdAt: dateField("created_at"),
  updatedAt: dateField("updated_at"),
});

export const link = sqliteTable("link", {
  id: text("id").primaryKey(),
  url: text("url").unique(),
  name: text("name"),
  logo: text("logo"),
  description: text("description"),
  status: text("status").default("ENABLE"),
  createdAt: dateField("created_at"),
  updatedAt: dateField("updated_at"),
});
