// --- 用户 (User) ---

/**
 * 用户等级常量数组。定义了系统中所有可能的用户等级。
 * 使用 `as const` 确保数组是只读的，并且其成员是字面量类型。
 */
export const USER_LEVEL = ["ADMIN", "EDITOR", "GUEST"] as const;

// --- 分类 (Category) ---

// --- 评论 (Comment) ---

/** 评论状态常量数组。 */
export const COMMENT_STATUS = [
  "TO_AUDIT", // 待审核
  "PUBLISH", // 已发布
  "RUBBISH", // 垃圾评论
  "BAN", // 已封禁
] as const;
/** 评论状态的 TypeScript 联合类型。 */

// --- 友情链接 (Link) ---
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

/** 文章类型常量数组。 */
export const POST_TYPE = ["ARTICLE", "MOVIE", "PHOTOGRAPH", "QUOTE"] as const;
/** 文章类型的 TypeScript 联合类型。 */

// --- 菜单 (Menu) ---

/** 菜单项类型常量数组。 */
export const MENU_TYPE = ["CATEGORY", "PAGE", "CUSTOM"] as const;

// --- 通用 (Generic) ---

/**
 * 评论关联的实体类型常量数组。
 * 用于标识评论是属于哪种类型的内容。
 * 注意：这里的 `CATEGORY` 和 `CUSTOM` 可能需要根据实际业务逻辑进行审视，看似与 `MENU_TYPE` 有重合。
 */
export const COMMENT_REF_TYPE = ["CATEGORY", "PAGE", "CUSTOM"] as const;
