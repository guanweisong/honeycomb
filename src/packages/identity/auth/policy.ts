import { UserStatus } from "@/packages/domain/identity/user";

export type AuthProviderConfig = {
  clientId: string;
  clientSecret: string;
};

export function canCreateSessionForUser(status: UserStatus) {
  return status === UserStatus.ENABLE;
}

export function getConfiguredProviderIds(
  providers: Record<
    "apple" | "google" | "github",
    AuthProviderConfig | undefined
  >,
) {
  return (["apple", "google", "github"] as const).filter(
    (providerId) => providers[providerId] !== undefined,
  );
}
