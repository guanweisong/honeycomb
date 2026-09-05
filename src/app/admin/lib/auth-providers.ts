import "server-only";

import { getAuthEnv } from "@/env/server";
import {
  getConfiguredProviderIds,
  SOCIAL_PROVIDER_LABELS,
} from "@/packages/identity/auth/providers";

export function getAuthProviders() {
  const env = getAuthEnv();
  return getConfiguredProviderIds(env).map((id) => ({
    id,
    name: SOCIAL_PROVIDER_LABELS[id],
  }));
}
