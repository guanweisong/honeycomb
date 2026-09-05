import "server-only";

import { getAuthEnv } from "@/env/server";
import { getConfiguredProviderIds, type SocialProviderId } from "./providers";

export function getEnabledSocialProviders(): SocialProviderId[] {
  const env = getAuthEnv();
  return getConfiguredProviderIds(env);
}
