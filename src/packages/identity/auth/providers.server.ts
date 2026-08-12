import "server-only";

import { getAuthEnv } from "@/env/server";
import { SOCIAL_PROVIDER_IDS, type SocialProviderId } from "./providers";

export function getEnabledSocialProviders(): SocialProviderId[] {
  const env = getAuthEnv();
  return SOCIAL_PROVIDER_IDS.filter((provider) => Boolean(env[provider]));
}
