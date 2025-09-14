import { USER_LEVEL, UserLevel as UserLevelType } from "@honeycomb/db";

export const UserLevel = Object.freeze({
  ADMIN: USER_LEVEL[0],
  EDITOR: USER_LEVEL[1],
  GUEST: USER_LEVEL[2],
} as const);
export type UserLevel = UserLevelType;

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
