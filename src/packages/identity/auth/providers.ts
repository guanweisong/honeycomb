export const SOCIAL_PROVIDER_IDS = ["apple", "google", "github"] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number];

export const SOCIAL_PROVIDER_LABELS: Record<SocialProviderId, string> = {
  apple: "Apple",
  google: "Google",
  github: "GitHub",
};
