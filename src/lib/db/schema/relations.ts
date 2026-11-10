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

export const categoryRelations = relations(category, ({ many }) => ({
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

export const commentRelations = relations(comment, ({ one }) => ({
  post: one(post, { fields: [comment.postId], references: [post.id] }),
  page: one(page, { fields: [comment.pageId], references: [page.id] }),
  customPost: one(post, {
    fields: [comment.customId],
    references: [post.id],
    relationName: "comment_custom_post",
  }),
}));

export const menuRelations = relations(menu, ({ one }) => ({
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
