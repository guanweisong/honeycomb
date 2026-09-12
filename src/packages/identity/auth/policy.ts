import {
  isUserEnabled,
  type UserStatus,
} from "@/packages/domain/identity/user";
export function canCreateSessionForUser(status: UserStatus) {
  return isUserEnabled(status);
}
