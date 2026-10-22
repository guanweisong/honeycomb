import { UserLevel } from "../types/user.level";
import { UserStatus } from "../types/user.status";
import { UserLevelName } from "../types/user.level-name";
import { UserStatusName } from "../types/user.status-name";

export const userLevelOptions = [
  { label: UserLevelName.ADMIN, value: UserLevel.ADMIN },
  { label: UserLevelName.EDITOR, value: UserLevel.EDITOR },
  { label: UserLevelName.GUEST, value: UserLevel.GUEST },
];

export const userStatusOptions = [
  { label: UserStatusName.DELETED, value: UserStatus.DELETED },
  { label: UserStatusName.DISABLE, value: UserStatus.DISABLE },
  { label: UserStatusName.ENABLE, value: UserStatus.ENABLE },
];
