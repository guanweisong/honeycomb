import { USER_STATUS, UserStatus as UserStatusType } from "@honeycomb/db";

export const UserStatus = Object.freeze({
  DELETED: USER_STATUS[0],
  ENABLE: USER_STATUS[1],
  DISABLE: USER_STATUS[2],
} as const);
export type UserStatus = UserStatusType;

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
