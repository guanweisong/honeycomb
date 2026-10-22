import { UserLevel } from "@/features/user/types/user.level";

export const Permission = {
  categoryReadAll: "category:read-all",
  categoryCreate: "category:create",
  categoryDelete: "category:delete",
  categoryUpdate: "category:update",
  commentReadAll: "comment:read-all",
  commentReadPrivate: "comment:read-private",
  commentModerate: "comment:moderate",
  linkReadAll: "link:read-all",
  linkCreate: "link:create",
  linkDelete: "link:delete",
  linkUpdate: "link:update",
  mediaReadAll: "media:read-all",
  mediaUpload: "media:upload",
  mediaDelete: "media:delete",
  menuReadAll: "menu:read-all",
  menuUpdate: "menu:update",
  pageReadAll: "page:read-all",
  pageReadUnpublished: "page:read-unpublished",
  pageCreate: "page:create",
  pageDelete: "page:delete",
  pageUpdate: "page:update",
  postReadAll: "post:read-all",
  postReadUnpublished: "post:read-unpublished",
  postCreate: "post:create",
  postDelete: "post:delete",
  postUpdate: "post:update",
  postManageTags: "post:manage-tags",
  settingUpdate: "setting:update",
  statisticsRead: "statistics:read",
  tagCreate: "tag:create",
  tagDelete: "tag:delete",
  tagUpdate: "tag:update",
  userReadSelf: "user:read-self",
  userReadAll: "user:read-all",
  userManage: "user:manage",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: readonly Permission[] = Object.freeze(
  Object.values(Permission),
);

export const ROLE_PERMISSIONS = {
  [UserLevel.ADMIN]: ALL_PERMISSIONS,
  [UserLevel.EDITOR]: [
    Permission.categoryReadAll,
    Permission.categoryCreate,
    Permission.categoryDelete,
    Permission.categoryUpdate,
    Permission.commentReadAll,
    Permission.commentReadPrivate,
    Permission.linkReadAll,
    Permission.mediaReadAll,
    Permission.mediaUpload,
    Permission.mediaDelete,
    Permission.menuReadAll,
    Permission.menuUpdate,
    Permission.pageReadAll,
    Permission.pageReadUnpublished,
    Permission.pageCreate,
    Permission.pageDelete,
    Permission.pageUpdate,
    Permission.postReadAll,
    Permission.postReadUnpublished,
    Permission.postCreate,
    Permission.postDelete,
    Permission.postUpdate,
    Permission.postManageTags,
    Permission.statisticsRead,
    Permission.tagCreate,
    Permission.tagUpdate,
    Permission.userReadSelf,
    Permission.userReadAll,
  ],
  [UserLevel.GUEST]: [
    Permission.categoryReadAll,
    Permission.commentReadAll,
    Permission.linkReadAll,
    Permission.mediaReadAll,
    Permission.menuReadAll,
    Permission.pageReadAll,
    Permission.postReadAll,
    Permission.statisticsRead,
    Permission.userReadSelf,
  ],
} as const satisfies Record<UserLevel, readonly Permission[]>;

const knownRoles = Object.values(UserLevel);
const knownPermissions = new Set<string>(ALL_PERMISSIONS);

export function can(
  role: string | null | undefined,
  permission: string,
): boolean {
  const knownRole = knownRoles.find((candidate) => candidate === role);
  if (!knownRole || !knownPermissions.has(permission)) {
    return false;
  }

  const grantedPermissions: readonly Permission[] = ROLE_PERMISSIONS[knownRole];
  return grantedPermissions.some((granted) => granted === permission);
}
