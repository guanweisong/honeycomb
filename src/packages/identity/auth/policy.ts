import { UserStatus } from "@/packages/domain/identity/user";
export { getConfiguredProviderIds, type AuthProviderConfig } from "./providers";
export function canCreateSessionForUser(status: UserStatus) {
  return status === UserStatus.ENABLE;
}
