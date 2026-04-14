/**
 * 用户状态
 */
export enum UserStatus {
  DELETED = "DELETED",
  ENABLE = "ENABLE",
  DISABLE = "DISABLE",
}

/** 用户状态对应的中文名称。 */
export enum UserStatusName {
  DELETED = "已删除",
  ENABLE = "启用",
  DISABLE = "禁用",
}

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
