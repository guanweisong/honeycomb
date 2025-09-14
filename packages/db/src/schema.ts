import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { MultiLang } from "./types";

// ===== 表 schema (单数表名) =====

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").$type<Date>(),
  updatedAt: text("updated_at").$type<Date>(),
  email: text("email").unique(),
  level: text("level").default("EDITOR"),
  name: text("name").unique(),
  password: text("password"),
  status: text("status").default("ENABLE"),
});

export const category = sqliteTable("category", {
  id: text("id").primaryKey(),
  description: text("description").$type<MultiLang>(),
  title: text("title").$type<MultiLang>(),
  parent: text("parent"),
  status: text("status").default("ENABLE"),
  path: text("path"),
  createdAt: text("created_at").$type<Date>(),
  updatedAt: text("updated_at").$type<Date>(),
});

export const post = sqliteTable("post", {
  id: text("id").primaryKey(),
  commentStatus: text("comment_status").default("ENABLE"),
  createdAt: text("created_at").$type<Date>(),
  galleryLocation: text("gallery_location").$type<MultiLang>(),
  galleryStyleIds: text("gallery_style_ids").$type<MultiLang>(),
  galleryTime: text("gallery_time").$type<Date>(),
  movieActorIds: text("movie_actor_ids").$type<MultiLang>(),
  movieDirectorIds: text("movie_director_ids").$type<MultiLang>(),
  movieStyleIds: text("movie_style_ids").$type<MultiLang>(),
  movieTime: text("movie_time").$type<Date>(),
  authorId: text("author_id"),
  categoryId: text("category_id"),
  content: text("content").$type<MultiLang>(),
  coverId: text("cover_id"),
  excerpt: text("excerpt").$type<MultiLang>(),
  status: text("status").default("TO_AUDIT"),
  title: text("title").$type<MultiLang>(),
  type: text("type").default("ARTICLE"),
  views: integer("views").default(0),
  quoteAuthor: text("quote_author").$type<MultiLang>(),
  quoteContent: text("quote_content").$type<MultiLang>(),
  updatedAt: text("updated_at").$type<Date>(),
});

export const page = sqliteTable("page", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").$type<Date>(),
  authorId: text("author_id"),
  content: text("content").$type<MultiLang>(),
  status: text("status").default("TO_AUDIT"),
  title: text("title").$type<MultiLang>(),
  views: integer("views").default(0),
  updatedAt: text("updated_at").$type<Date>(),
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
  createdAt: text("created_at").$type<Date>(),
  updatedAt: text("updated_at").$type<Date>(),
});

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").$type<Date>(),
  key: text("key"),
  name: text("name"),
  size: integer("size"),
  type: text("type"),
  url: text("url"),
  updatedAt: text("updated_at").$type<Date>(),
  color: text("color"),
  height: integer("height"),
  width: integer("width"),
});

export const token = sqliteTable("token", {
  id: text("id").primaryKey(),
  content: text("content").unique(),
  userId: text("user_id"),
  createdAt: text("created_at").$type<Date>(),
  updatedAt: text("updated_at").$type<Date>(),
});

export const setting = sqliteTable("setting", {
  id: text("id").primaryKey(),
  siteName: text("site_name").$type<MultiLang>(),
  siteSubName: text("site_sub_name").$type<MultiLang>(),
  siteSignature: text("site_signature").$type<MultiLang>(),
  siteCopyright: text("site_copyright").$type<MultiLang>(),
  siteRecordNo: text("site_record_no"),
  siteRecordUrl: text("site_record_url"),
  updatedAt: text("updated_at").$type<Date>(),
});

export const menu = sqliteTable("menu", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").$type<Date>(),
  parent: text("parent"),
  power: integer("power"),
  type: text("type"),
  updatedAt: text("updated_at").$type<Date>(),
});

export const tag = sqliteTable("tag", {
  id: text("id").primaryKey(),
  name: text("name").$type<MultiLang>(),
  createdAt: text("created_at").$type<Date>(),
  updatedAt: text("updated_at").$type<Date>(),
});

export const link = sqliteTable("link", {
  id: text("id").primaryKey(),
  url: text("url").unique(),
  name: text("name"),
  logo: text("logo"),
  description: text("description"),
  status: text("status").default("ENABLE"),
  createdAt: text("created_at").$type<Date>(),
  updatedAt: text("updated_at").$type<Date>(),
});

// ===== JSON & Date 字段 =====

export const tableJsonFields = {
  user: [] as const,
  category: ["description", "title"] as const,
  post: [
    "galleryLocation",
    "galleryStyleIds",
    "movieActorIds",
    "movieDirectorIds",
    "movieStyleIds",
    "content",
    "excerpt",
    "title",
    "quoteAuthor",
    "quoteContent",
  ] as const,
  page: ["content", "title"] as const,
  comment: [] as const,
  media: [] as const,
  token: [] as const,
  setting: [
    "siteName",
    "siteSubName",
    "siteSignature",
    "siteCopyright",
  ] as const,
  menu: [] as const,
  tag: ["name"] as const,
  link: [] as const,
};

export const tableDateFields = {
  user: ["created_at", "updated_at"] as const,
  category: ["created_at", "updated_at"] as const,
  post: ["created_at", "updated_at", "galleryTime", "movieTime"] as const,
  page: ["created_at", "updated_at"] as const,
  comment: ["created_at", "updated_at"] as const,
  media: ["created_at", "updated_at"] as const,
  token: ["created_at", "updated_at"] as const,
  setting: ["updated_at"] as const,
  menu: ["created_at", "updated_at"] as const,
  tag: ["created_at", "updated_at"] as const,
  link: ["created_at", "updated_at"] as const,
};

// ===== 表名映射 =====
export const tableMap = {
  user,
  category,
  post,
  page,
  comment,
  media,
  token,
  setting,
  menu,
  tag,
  link,
} as const;

export type TableName = keyof typeof tableMap;
