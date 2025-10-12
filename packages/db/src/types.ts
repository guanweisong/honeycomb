/**
 * 多语言文本结构类型。
 * 用于在单个字段中存储中英文两种语言的内容。
 */
export type MultiLang = {
  zh: string;
  en: string;
};

// --- 用户 (User) ---

/**
 * 用户等级常量数组。定义了系统中所有可能的用户等级。
 * 使用 `as const` 确保数组是只读的，并且其成员是字面量类型。
 */
export const USER_LEVEL = ["ADMIN", "EDITOR", "GUEST"] as const;
/** 用户等级的 TypeScript 联合类型，从 `USER_LEVEL` 数组推断而来。 */
export type UserLevel = (typeof USER_LEVEL)[number];
/** 用户等级的常量对象，方便在代码中以点操作符访问，避免硬编码字符串。 */
export const UserLevel = Object.freeze({
  ADMIN: USER_LEVEL[0],
  EDITOR: USER_LEVEL[1],
  GUEST: USER_LEVEL[2],
} as const);
/** 用户等级对应的中文名称。 */
export const UserLevelName = Object.freeze({
  ADMIN: "管理员",
  EDITOR: "编辑",
  GUEST: "游客",
} as const);

/** 用于在 UI（如下拉菜单）中显示用户等级的选项数组。 */
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

/** 用户状态常量数组。 */
export const USER_STATUS = ["DELETED", "ENABLE", "DISABLE"] as const;
/** 用户状态的 TypeScript 联合类型。 */
export type UserStatus = (typeof USER_STATUS)[number];
/** 用户状态的常量对象。 */
export const UserStatus = Object.freeze({
  DELETED: USER_STATUS[0],
  ENABLE: USER_STATUS[1],
  DISABLE: USER_STATUS[2],
} as const);
/** 用户状态对应的中文名称。 */
export const UserStatusName = Object.freeze({
  DELETED: "已删除",
  DISABLE: "禁用",
  ENABLE: "启用",
} as const);

/** 用于在 UI 中显示用户状态的选项数组。 */
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

// --- 分类 (Category) ---

/** 分类状态常量数组。 */
export const CATEGORY_STATUS = ["ENABLE", "DISABLE"] as const;
/** 分类状态的 TypeScript 联合类型。 */
export type CategoryStatus = (typeof CATEGORY_STATUS)[number];
/** 分类状态的常量对象。 */
export const CategoryStatus = Object.freeze({
  ENABLE: CATEGORY_STATUS[0],
  DISABLE: CATEGORY_STATUS[1],
} as const);

// --- 评论 (Comment) ---

/** 评论状态常量数组。 */
export const COMMENT_STATUS = [
  "TO_AUDIT", // 待审核
  "PUBLISH", // 已发布
  "RUBBISH", // 垃圾评论
  "BAN", // 已封禁
] as const;
/** 评论状态的 TypeScript 联合类型。 */
export type CommentStatus = (typeof COMMENT_STATUS)[number];
/** 评论状态的常量对象。 */
export const CommentStatus = Object.freeze({
  TO_AUDIT: COMMENT_STATUS[0],
  PUBLISH: COMMENT_STATUS[1],
  RUBBISH: COMMENT_STATUS[2],
  BAN: COMMENT_STATUS[3],
} as const);

// --- 友情链接 (Link) ---

/** 友情链接状态常量数组。 */
export const LINK_STATUS = ["ENABLE", "DISABLE"] as const;
/** 友情链接状态的 TypeScript 联合类型。 */
export type LinkStatus = (typeof LINK_STATUS)[number];
/** 友情链接状态的常量对象。 */
export const LinkStatus = Object.freeze({
  ENABLE: LINK_STATUS[0],
  DISABLE: LINK_STATUS[1],
} as const);
/** 用于在 UI 中显示友情链接状态的选项数组。 */
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

// --- 独立页面 (Page) ---

/** 独立页面状态常量数组。 */
export const PAGE_STATUS = ["PUBLISHED", "DRAFT", "TO_AUDIT"] as const;
/** 独立页面状态的 TypeScript 联合类型。 */
export type PageStatus = (typeof PAGE_STATUS)[number];
/** 独立页面状态的常量对象。 */
export const PageStatus = Object.freeze({
  PUBLISHED: PAGE_STATUS[0],
  DRAFT: PAGE_STATUS[1],
  TO_AUDIT: PAGE_STATUS[2],
} as const);
/** 独立页面状态对应的中文名称。 */
export const PageStatusName = Object.freeze({
  PUBLISHED: "已发布",
  DRAFT: "草稿",
  TO_AUDIT: "待审核",
} as const);
/** 用于在 UI 中显示独立页面状态的选项数组。 */
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

// --- 文章 (Post) ---

/** 文章状态常量数组。 */
export const POST_STATUS = ["PUBLISHED", "DRAFT", "TO_AUDIT"] as const;
/** 文章状态的 TypeScript 联合类型。 */
export type PostStatus = (typeof POST_STATUS)[number];
/** 文章状态的常量对象。 */
export const PostStatus = Object.freeze({
  PUBLISHED: POST_STATUS[0],
  DRAFT: POST_STATUS[1],
  TO_AUDIT: POST_STATUS[2],
} as const);

/** 文章类型常量数组。 */
export const POST_TYPE = ["ARTICLE", "MOVIE", "PHOTOGRAPH", "QUOTE"] as const;
/** 文章类型的 TypeScript 联合类型。 */
export type PostType = (typeof POST_TYPE)[number];
/** 文章类型的常量对象。 */
export const PostType = Object.freeze({
  ARTICLE: POST_TYPE[0],
  MOVIE: POST_TYPE[1],
  PHOTOGRAPH: POST_TYPE[2],
  QUOTE: POST_TYPE[3],
} as const);
/** 文章类型对应的中文名称。 */
export const PostTypeName = Object.freeze({
  ARTICLE: "文章",
  MOVIE: "电影",
  PHOTOGRAPH: "画廊",
  QUOTE: "引用",
} as const);

/** 用于在 UI 中显示文章类型的选项数组。 */
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

/** 文章状态对应的中文名称。 */
export const PostStatusName = Object.freeze({
  PUBLISHED: "已发布",
  DRAFT: "草稿",
  TO_AUDIT: "待审核",
} as const);

/** 用于在 UI 中显示文章状态的选项数组。 */
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

/** 文章的评论功能状态常量数组。 */
export const POST_COMMENT_STATUS = ["ENABLE", "DISABLE"] as const;
/** 文章评论状态的 TypeScript 联合类型。 */
export type PostCommentStatus = (typeof POST_COMMENT_STATUS)[number];
/** 文章评论状态的常量对象。 */
export const PostCommentStatus = Object.freeze({
  ENABLE: POST_COMMENT_STATUS[0],
  DISABLE: POST_COMMENT_STATUS[1],
} as const);

// --- 菜单 (Menu) ---

/** 菜单项类型常量数组。 */
export const MENU_TYPE = ["CATEGORY", "PAGE", "CUSTOM"] as const;
/** 菜单项类型的 TypeScript 联合类型。 */
export type MenuType = (typeof MENU_TYPE)[number];
/** 菜单项类型的常量对象。 */
export const MenuType = Object.freeze({
  CATEGORY: MENU_TYPE[0], // 关联到分类
  PAGE: MENU_TYPE[1], // 关联到独立页面
  CUSTOM: MENU_TYPE[2], // 自定义链接
} as const);

// --- 通用 (Generic) ---

/**
 * 评论关联的实体类型常量数组。
 * 用于标识评论是属于哪种类型的内容。
 * 注意：这里的 `CATEGORY` 和 `CUSTOM` 可能需要根据实际业务逻辑进行审视，看似与 `MENU_TYPE` 有重合。
 */
export const COMMENT_REF_TYPE = ["CATEGORY", "PAGE", "CUSTOM"] as const;
/** 评论关联实体类型的 TypeScript 联合类型。 */
export type CommentRefType = (typeof COMMENT_REF_TYPE)[number];
/** 评论关联实体类型的常量对象。 */
export const CommentRefType = Object.freeze({
  CATEGORY: COMMENT_REF_TYPE[0],
  PAGE: COMMENT_REF_TYPE[1],
  CUSTOM: COMMENT_REF_TYPE[2],
} as const);

/** 通用的启用/禁用状态常量数组。 */
export const ENABLE_STATUS = ["DISABLE", "ENABLE"] as const;
/** 通用启用/禁用状态的 TypeScript 联合类型。 */
export type EnableStatus = (typeof ENABLE_STATUS)[number];
/** 通用启用/禁用状态的常量对象。 */
export const EnableStatus = Object.freeze({
  DISABLE: ENABLE_STATUS[0],
  ENABLE: ENABLE_STATUS[1],
} as const);
