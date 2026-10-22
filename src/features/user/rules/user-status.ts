import { UserStatus } from "../types/user.status";

export function isUserEnabled(status: UserStatus): boolean {
  return status === UserStatus.ENABLE;
}
