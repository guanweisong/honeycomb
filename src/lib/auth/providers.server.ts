import "server-only";

import { getAuthEnv } from "@/env/server";
import { getConfiguredProviderIds, type SocialProviderId } from "@/lib/auth/providers";

export function getEnabledSocialProviders(): SocialProviderId[] {
  const env = getAuthEnv();
  return getConfiguredProviderIds(env);
}
