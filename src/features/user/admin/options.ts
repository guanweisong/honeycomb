import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { UserLevelName } from "@/features/user/types/user.level-name";
import { UserStatusName } from "@/features/user/types/user.status-name";

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
