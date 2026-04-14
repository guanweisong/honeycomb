/**
 * 用户等级常量数组。定义了系统中所有可能的用户等级。
 */

export enum UserLevel {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  GUEST = "GUEST",
}

/** 用户等级对应的中文名称。 */
export enum UserLevelName {
  ADMIN = "管理员",
  EDITOR = "编辑",
  GUEST = "游客",
}

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
