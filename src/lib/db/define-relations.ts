import { relations } from "drizzle-orm";
import type * as schema from "./schema";

type RelationTables = Pick<
  typeof schema,
  | "user"
  | "account"
  | "session"
  | "passkey"
  | "loginHistory"
  | "category"
  | "categoryTranslation"
  | "media"
  | "post"
  | "postTranslation"
  | "tag"
  | "tagTranslation"
  | "postTag"
  | "page"
  | "pageTranslation"
  | "comment"
  | "menu"
  | "setting"
  | "settingTranslation"
>;

/** 创建数据库关系定义，避免表声明文件同时承担关系编排职责。 */
export function defineRelations(tables: RelationTables) {
  const {
    user,
    account,
    session,
    passkey,
    loginHistory,
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
  } = tables;

  return {
    userRelations: relations(user, ({ many }) => ({
      posts: many(post),
      pages: many(page),
      accounts: many(account),
      sessions: many(session),
      passkeys: many(passkey),
      loginHistories: many(loginHistory),
    })),
    accountRelations: relations(account, ({ one }) => ({
      user: one(user, { fields: [account.userId], references: [user.id] }),
    })),
    sessionRelations: relations(session, ({ one }) => ({
      user: one(user, { fields: [session.userId], references: [user.id] }),
    })),
    passkeyRelations: relations(passkey, ({ one }) => ({
      user: one(user, { fields: [passkey.userId], references: [user.id] }),
    })),
    loginHistoryRelations: relations(loginHistory, ({ one }) => ({
      user: one(user, { fields: [loginHistory.userId], references: [user.id] }),
    })),
    categoryRelations: relations(category, ({ many, one }) => ({
      posts: many(post),
      parentItem: one(category, {
        fields: [category.parent],
        references: [category.id],
        relationName: "category_parent",
      }),
      children: many(category, { relationName: "category_parent" }),
      translations: many(categoryTranslation),
    })),
    categoryTranslationRelations: relations(categoryTranslation, ({ one }) => ({
      owner: one(category, {
        fields: [categoryTranslation.categoryId],
        references: [category.id],
      }),
    })),
    mediaRelations: relations(media, ({ many }) => ({
      coverPosts: many(post),
    })),
    postRelations: relations(post, ({ one, many }) => ({
      author: one(user, { fields: [post.authorId], references: [user.id] }),
      category: one(category, {
        fields: [post.categoryId],
        references: [category.id],
      }),
      cover: one(media, { fields: [post.coverId], references: [media.id] }),
      postTags: many(postTag),
      translations: many(postTranslation),
    })),
    postTranslationRelations: relations(postTranslation, ({ one }) => ({
      owner: one(post, {
        fields: [postTranslation.postId],
        references: [post.id],
      }),
    })),
    tagRelations: relations(tag, ({ many }) => ({
      postTags: many(postTag),
      translations: many(tagTranslation),
    })),
    tagTranslationRelations: relations(tagTranslation, ({ one }) => ({
      owner: one(tag, {
        fields: [tagTranslation.tagId],
        references: [tag.id],
      }),
    })),
    postTagRelations: relations(postTag, ({ one }) => ({
      post: one(post, { fields: [postTag.postId], references: [post.id] }),
      tag: one(tag, { fields: [postTag.tagId], references: [tag.id] }),
    })),
    pageRelations: relations(page, ({ one, many }) => ({
      author: one(user, { fields: [page.authorId], references: [user.id] }),
      comments: many(comment),
      translations: many(pageTranslation),
    })),
    pageTranslationRelations: relations(pageTranslation, ({ one }) => ({
      owner: one(page, {
        fields: [pageTranslation.pageId],
        references: [page.id],
      }),
    })),
    commentRelations: relations(comment, ({ one, many }) => ({
      post: one(post, { fields: [comment.postId], references: [post.id] }),
      page: one(page, { fields: [comment.pageId], references: [page.id] }),
      parent: one(comment, {
        fields: [comment.parentId],
        references: [comment.id],
        relationName: "comment_parent",
      }),
      children: many(comment, { relationName: "comment_parent" }),
    })),
    menuRelations: relations(menu, ({ one, many }) => ({
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
    })),
    settingRelations: relations(setting, ({ many }) => ({
      translations: many(settingTranslation),
    })),
    settingTranslationRelations: relations(settingTranslation, ({ one }) => ({
      owner: one(setting, {
        fields: [settingTranslation.settingId],
        references: [setting.id],
      }),
    })),
  };
}
