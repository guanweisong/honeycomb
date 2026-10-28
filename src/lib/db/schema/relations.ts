import { relations } from "drizzle-orm";
import {
  user,
  account,
  passkey,
  session,
  loginHistory,
} from "@/lib/db/schema/auth";
import {
  category,
  categoryTranslation,
  media,
  post,
  postTranslation,
  tag,
  tagTranslation,
  postTag,
  page,
  pageTranslation,
  comment,
  menu,
  setting,
  settingTranslation,
} from "@/lib/db/schema/content";

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
  user: one(user, { fields: [loginHistory.userId], references: [user.id] }),
}));

export const categoryRelations = relations(category, ({ many, one }) => ({
  posts: many(post),
  parentItem: one(category, {
    fields: [category.parent],
    references: [category.id],
    relationName: "category_parent",
  }),
  children: many(category, { relationName: "category_parent" }),
  translations: many(categoryTranslation),
}));

export const categoryTranslationRelations = relations(
  categoryTranslation,
  ({ one }) => ({
    owner: one(category, {
      fields: [categoryTranslation.categoryId],
      references: [category.id],
    }),
  }),
);

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
  translations: many(postTranslation),
}));

export const postTranslationRelations = relations(
  postTranslation,
  ({ one }) => ({
    owner: one(post, {
      fields: [postTranslation.postId],
      references: [post.id],
    }),
  }),
);

export const tagRelations = relations(tag, ({ many }) => ({
  postTags: many(postTag),
  translations: many(tagTranslation),
}));

export const tagTranslationRelations = relations(tagTranslation, ({ one }) => ({
  owner: one(tag, {
    fields: [tagTranslation.tagId],
    references: [tag.id],
  }),
}));

export const postTagRelations = relations(postTag, ({ one }) => ({
  post: one(post, { fields: [postTag.postId], references: [post.id] }),
  tag: one(tag, { fields: [postTag.tagId], references: [tag.id] }),
}));

export const pageRelations = relations(page, ({ one, many }) => ({
  author: one(user, { fields: [page.authorId], references: [user.id] }),
  comments: many(comment),
  translations: many(pageTranslation),
}));

export const pageTranslationRelations = relations(
  pageTranslation,
  ({ one }) => ({
    owner: one(page, {
      fields: [pageTranslation.pageId],
      references: [page.id],
    }),
  }),
);

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

export const settingRelations = relations(setting, ({ many }) => ({
  translations: many(settingTranslation),
}));

export const settingTranslationRelations = relations(
  settingTranslation,
  ({ one }) => ({
    owner: one(setting, {
      fields: [settingTranslation.settingId],
      references: [setting.id],
    }),
  }),
);
