import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { i18nField } from "./i18nField";
import { arrayField } from "./arrayField";
import { objectId } from "./objectId";
import { withTimestamps } from "./timestamps";

export const user = sqliteTable("user", {
  id: text("id").primaryKey().default(objectId()),
  email: text("email").unique(),
  level: text("level").default("EDITOR"),
  name: text("name").unique(),
  password: text("password"),
  status: text("status").default("ENABLE"),
  ...withTimestamps(),
});

export const category = sqliteTable("category", {
  id: text("id").primaryKey().default(objectId()),
  description: i18nField("description"),
  title: i18nField("title"),
  parent: text("parent"),
  status: text("status").default("ENABLE"),
  path: text("path"),
  ...withTimestamps(),
});

export const post = sqliteTable("post", {
  id: text("id").primaryKey().default(objectId()),
  commentStatus: text("comment_status").default("ENABLE"),
  galleryLocation: i18nField("gallery_location"),
  galleryStyleIds: arrayField<string>("gallery_style_ids"),
  galleryTime: text("gallery_time"),
  movieActorIds: arrayField("movie_actor_ids"),
  movieDirectorIds: arrayField("movie_director_ids"),
  movieStyleIds: arrayField("movie_style_ids"),
  movieTime: text("movie_time"),
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
  ...withTimestamps(),
});

export const page = sqliteTable("page", {
  id: text("id").primaryKey().default(objectId()),
  authorId: text("author_id"),
  content: i18nField("content"),
  status: text("status").default("TO_AUDIT"),
  title: i18nField("title"),
  views: integer("views").default(0),
  ...withTimestamps(),
});

export const comment = sqliteTable("comment", {
  id: text("id").primaryKey().default(objectId()),
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
  ...withTimestamps(),
});

export const media = sqliteTable("media", {
  id: text("id").primaryKey().default(objectId()),
  key: text("key"),
  name: text("name"),
  size: integer("size"),
  type: text("type"),
  url: text("url"),
  color: text("color"),
  height: integer("height"),
  width: integer("width"),
  ...withTimestamps(),
});

export const token = sqliteTable("token", {
  id: text("id").primaryKey().default(objectId()),
  content: text("content").unique(),
  userId: text("user_id"),
  ...withTimestamps(),
});

export const setting = sqliteTable("setting", {
  id: text("id").primaryKey().default(objectId()),
  siteName: i18nField("site_name"),
  siteSubName: i18nField("site_sub_name"),
  siteSignature: i18nField("site_signature"),
  siteCopyright: i18nField("site_copyright"),
  siteRecordNo: text("site_record_no"),
  siteRecordUrl: text("site_record_url"),
  ...withTimestamps(),
});

export const menu = sqliteTable("menu", {
  id: text("id").primaryKey().default(objectId()),
  parent: text("parent"),
  power: integer("power"),
  type: text("type"),
  ...withTimestamps(),
});

export const tag = sqliteTable("tag", {
  id: text("id").primaryKey().default(objectId()),
  name: i18nField("name"),
  ...withTimestamps(),
});

export const link = sqliteTable("link", {
  id: text("id").primaryKey().default(objectId()),
  url: text("url").unique(),
  name: text("name"),
  logo: text("logo"),
  description: text("description"),
  status: text("status").default("ENABLE"),
  ...withTimestamps(),
});
