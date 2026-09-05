export const SOCIAL_PROVIDER_IDS = ["apple", "google", "github"] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number];

export type AuthProviderConfig = { clientId: string; clientSecret: string };

/** 登录页与账号安全页共同使用的已配置提供商列表。 */
export function getConfiguredProviderIds(
  providers: Record<SocialProviderId, AuthProviderConfig | undefined>,
) {
  return SOCIAL_PROVIDER_IDS.filter((id) => providers[id] !== undefined);
}

export const SOCIAL_PROVIDER_LABELS: Record<SocialProviderId, string> = {
  apple: "Apple",
  google: "Google",
  github: "GitHub",
};
