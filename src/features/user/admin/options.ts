import { UserLevel, UserStatus } from "@/features/user/user";

export enum UserLevelName {
  ADMIN = "管理员",
  EDITOR = "编辑",
  GUEST = "游客",
}

export const userLevelOptions = [
  { label: UserLevelName.ADMIN, value: UserLevel.ADMIN },
  { label: UserLevelName.EDITOR, value: UserLevel.EDITOR },
  { label: UserLevelName.GUEST, value: UserLevel.GUEST },
];

export enum UserStatusName {
  DELETED = "已删除",
  ENABLE = "启用",
  DISABLE = "禁用",
}

export const userStatusOptions = [
  { label: UserStatusName.DELETED, value: UserStatus.DELETED },
  { label: UserStatusName.DISABLE, value: UserStatus.DISABLE },
  { label: UserStatusName.ENABLE, value: UserStatus.ENABLE },
];
