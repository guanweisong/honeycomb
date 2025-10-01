export type MultiLang = {
  zh: string;
  en: string;
};

// Shared enum-like literal arrays and their TS types
export const USER_LEVEL = ["ADMIN", "EDITOR", "GUEST"] as const;
export type UserLevel = (typeof USER_LEVEL)[number];
export const UserLevel = Object.freeze({
  ADMIN: USER_LEVEL[0],
  EDITOR: USER_LEVEL[1],
  GUEST: USER_LEVEL[2],
} as const);
export const UserLevelName = Object.freeze({
  ADMIN: "管理员",
  EDITOR: "编辑",
  GUEST: "游客",
} as const);

export const userLevelOptions = [
  {
    label: UserLevelName.ADMIN,
    value: UserLevel.ADMIN,
  },
  {
    label: UserLevelName.EDITOR,
    value: UserLevel.EDITOR,
  },
  {
    label: UserLevelName.GUEST,
    value: UserLevel.GUEST,
  },
];

export const USER_STATUS = ["DELETED", "ENABLE", "DISABLE"] as const;
export type UserStatus = (typeof USER_STATUS)[number];
export const UserStatus = Object.freeze({
  DELETED: USER_STATUS[0],
  ENABLE: USER_STATUS[1],
  DISABLE: USER_STATUS[2],
} as const);
export const UserStatusName = Object.freeze({
  DELETED: "已删除",
  DISABLE: "禁用",
  ENABLE: "启用",
} as const);

export const userStatusOptions = [
  {
    label: UserStatusName.DELETED,
    value: UserStatus.DELETED,
  },
  {
    label: UserStatusName.DISABLE,
    value: UserStatus.DISABLE,
  },
  {
    label: UserStatusName.ENABLE,
    value: UserStatus.ENABLE,
  },
];

export const CATEGORY_STATUS = ["ENABLE", "DISABLE"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUS)[number];
export const CategoryStatus = Object.freeze({
  ENABLE: CATEGORY_STATUS[0],
  DISABLE: CATEGORY_STATUS[1],
} as const);

export const COMMENT_STATUS = [
  "TO_AUDIT",
  "PUBLISH",
  "RUBBISH",
  "BAN",
] as const;
export type CommentStatus = (typeof COMMENT_STATUS)[number];
export const CommentStatus = Object.freeze({
  TO_AUDIT: COMMENT_STATUS[0],
  PUBLISH: COMMENT_STATUS[1],
  RUBBISH: COMMENT_STATUS[2],
  BAN: COMMENT_STATUS[3],
} as const);

export const LINK_STATUS = ["ENABLE", "DISABLE"] as const;
export type LinkStatus = (typeof LINK_STATUS)[number];
export const LinkStatus = Object.freeze({
  ENABLE: LINK_STATUS[0],
  DISABLE: LINK_STATUS[1],
} as const);
export const linkStatusOptions = [
  {
    label: "禁用",
    value: LinkStatus.DISABLE,
  },
  {
    label: "启用",
    value: LinkStatus.ENABLE,
  },
];

export const PAGE_STATUS = ["PUBLISHED", "DRAFT", "TO_AUDIT"] as const;
export type PageStatus = (typeof PAGE_STATUS)[number];
export const PageStatus = Object.freeze({
  PUBLISHED: PAGE_STATUS[0],
  DRAFT: PAGE_STATUS[1],
  TO_AUDIT: PAGE_STATUS[2],
} as const);
export const PageStatusName = Object.freeze({
  PUBLISHED: "已发布",
  DRAFT: "草稿",
  TO_AUDIT: "待审核",
} as const);
export const pageStatusOptions = [
  {
    label: PageStatusName.PUBLISHED,
    value: PageStatus.PUBLISHED,
  },
  {
    label: PageStatusName.DRAFT,
    value: PageStatus.DRAFT,
  },
  {
    label: PageStatusName.TO_AUDIT,
    value: PageStatus.TO_AUDIT,
  },
];

export const POST_STATUS = ["PUBLISHED", "DRAFT", "TO_AUDIT"] as const;
export type PostStatus = (typeof POST_STATUS)[number];
export const PostStatus = Object.freeze({
  PUBLISHED: POST_STATUS[0],
  DRAFT: POST_STATUS[1],
  TO_AUDIT: POST_STATUS[2],
} as const);

export const POST_TYPE = ["ARTICLE", "MOVIE", "PHOTOGRAPH", "QUOTE"] as const;
export type PostType = (typeof POST_TYPE)[number];
export const PostType = Object.freeze({
  ARTICLE: POST_TYPE[0],
  MOVIE: POST_TYPE[1],
  PHOTOGRAPH: POST_TYPE[2],
  QUOTE: POST_TYPE[3],
} as const);
export const PostTypeName = Object.freeze({
  ARTICLE: "文章",
  MOVIE: "电影",
  PHOTOGRAPH: "画廊",
  QUOTE: "引用",
} as const);
export const PostTypeBgColor = Object.freeze({
  ARTICLE: "bg-green-500",
  MOVIE: "bg-orange-500",
  PHOTOGRAPH: "bg-purple-500",
  QUOTE: "bg-blue-500",
} as const);

export const postTypeOptions = [
  {
    label: PostTypeName.ARTICLE,
    value: PostType.ARTICLE,
  },
  {
    label: PostTypeName.MOVIE,
    value: PostType.MOVIE,
  },
  {
    label: PostTypeName.PHOTOGRAPH,
    value: PostType.PHOTOGRAPH,
  },
  {
    label: PostTypeName.QUOTE,
    value: PostType.QUOTE,
  },
];

export const PostStatusName = Object.freeze({
  PUBLISHED: "已发布",
  DRAFT: "草稿",
  TO_AUDIT: "待审核",
} as const);

export const postStatusOptions = [
  {
    label: PostStatusName.PUBLISHED,
    value: PostStatus.PUBLISHED,
  },
  {
    label: PostStatusName.DRAFT,
    value: PostStatus.DRAFT,
  },
  {
    label: PostStatusName.TO_AUDIT,
    value: PostStatus.TO_AUDIT,
  },
];

export const MENU_TYPE = ["CATEGORY", "PAGE", "CUSTOM"] as const;
export type MenuType = (typeof MENU_TYPE)[number];
export const MenuType = Object.freeze({
  CATEGORY: MENU_TYPE[0],
  PAGE: MENU_TYPE[1],
  CUSTOM: MENU_TYPE[2],
} as const);

export const POST_COMMENT_STATUS = ["ENABLE", "DISABLE"] as const;
export type PostCommentStatus = (typeof POST_COMMENT_STATUS)[number];
export const PostCommentStatus = Object.freeze({
  ENABLE: POST_COMMENT_STATUS[0],
  DISABLE: POST_COMMENT_STATUS[1],
} as const);

// Comment ref type used in CommentQuerySchema (CATEGORY | PAGE | CUSTOM)
export const COMMENT_REF_TYPE = ["CATEGORY", "PAGE", "CUSTOM"] as const;
export type CommentRefType = (typeof COMMENT_REF_TYPE)[number];
export const CommentRefType = Object.freeze({
  CATEGORY: COMMENT_REF_TYPE[0],
  PAGE: COMMENT_REF_TYPE[1],
  CUSTOM: COMMENT_REF_TYPE[2],
} as const);

// Generic enable/disable status for UI toggles
export const ENABLE_STATUS = ["DISABLE", "ENABLE"] as const;
export type EnableStatus = (typeof ENABLE_STATUS)[number];
export const EnableStatus = Object.freeze({
  DISABLE: ENABLE_STATUS[0],
  ENABLE: ENABLE_STATUS[1],
} as const);
