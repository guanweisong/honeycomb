import { Permission, type Permission as PermissionValue } from "@/packages/identity/auth/permissions";

/** 后台页面与最低 capability 的静态登记表，防止新增页面遗漏权限设计。 */
export const adminRouteCapabilities = {
  "/admin": Permission.statisticsRead,
  "/admin/account/security": Permission.userReadSelf,
  "/admin/comment": Permission.commentReadAll,
  "/admin/dashboard": Permission.statisticsRead,
  "/admin/link": Permission.linkReadAll,
  "/admin/media": Permission.mediaReadAll,
  "/admin/menu": Permission.menuReadAll,
  "/admin/page": Permission.pageReadAll,
  "/admin/page/edit": Permission.pageReadAll,
  "/admin/page/list": Permission.pageReadAll,
  "/admin/post": Permission.postReadAll,
  "/admin/post/category": Permission.categoryReadAll,
  "/admin/post/edit": Permission.postReadAll,
  "/admin/post/list": Permission.postReadAll,
  "/admin/setting": Permission.settingUpdate,
  "/admin/tag": Permission.tagCreate,
  "/admin/user": Permission.userReadAll,
} as const satisfies Record<string, PermissionValue>;

export type AdminRoutePath = keyof typeof adminRouteCapabilities;
