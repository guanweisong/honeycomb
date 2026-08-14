import { relations } from "drizzle-orm";
import {
  account,
  category,
  comment,
  loginHistory,
  media,
  menu,
  page,
  passkey,
  post,
  postTag,
  session,
  tag,
  user,
} from "./schema";

/** 用户及认证相关实体的关系定义。 */
export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
  pages: many(page),
  accounts: many(account),
  sessions: many(session),
  passkeys: many(passkey),
  loginHistories: many(loginHistory),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, { fields: [passkey.userId], references: [user.id] }),
}));

export const loginHistoryRelations = relations(loginHistory, ({ one }) => ({
  user: one(user, {
    fields: [loginHistory.userId],
    references: [user.id],
  }),
}));

export const categoryRelations = relations(category, ({ many, one }) => ({
  posts: many(post),
  parentItem: one(category, {
    fields: [category.parent],
    references: [category.id],
    relationName: "category_parent",
  }),
  children: many(category, { relationName: "category_parent" }),
}));

export const mediaRelations = relations(media, ({ many }) => ({
  coverPosts: many(post),
}));

export const postRelations = relations(post, ({ one, many }) => ({
  author: one(user, { fields: [post.authorId], references: [user.id] }),
  category: one(category, {
    fields: [post.categoryId],
    references: [category.id],
  }),
  cover: one(media, { fields: [post.coverId], references: [media.id] }),
  postTags: many(postTag),
}));

export const tagRelations = relations(tag, ({ many }) => ({
  postTags: many(postTag),
}));

export const postTagRelations = relations(postTag, ({ one }) => ({
  post: one(post, { fields: [postTag.postId], references: [post.id] }),
  tag: one(tag, { fields: [postTag.tagId], references: [tag.id] }),
}));

export const pageRelations = relations(page, ({ one, many }) => ({
  author: one(user, { fields: [page.authorId], references: [user.id] }),
  comments: many(comment),
}));

export const commentRelations = relations(comment, ({ one, many }) => ({
  post: one(post, { fields: [comment.postId], references: [post.id] }),
  page: one(page, { fields: [comment.pageId], references: [page.id] }),
  parent: one(comment, {
    fields: [comment.parentId],
    references: [comment.id],
    relationName: "comment_parent",
  }),
  children: many(comment, { relationName: "comment_parent" }),
}));

export const menuRelations = relations(menu, ({ one, many }) => ({
  parentItem: one(menu, {
    fields: [menu.parent],
    references: [menu.id],
    relationName: "menu_parent",
  }),
  children: many(menu, { relationName: "menu_parent" }),
  category: one(category, {
    fields: [menu.categoryId],
    references: [category.id],
  }),
  page: one(page, { fields: [menu.pageId], references: [page.id] }),
}));
