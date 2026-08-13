import "server-only";

import { getAuthEnv } from "@/env/server";
import { getConfiguredProviderIds } from "@/packages/identity/auth/policy";

const providerNames: Record<string, string> = {
  apple: "Apple",
  google: "Google",
  github: "GitHub",
};

export function getAuthProviders() {
  const env = getAuthEnv();
  return getConfiguredProviderIds(env).map((id) => ({
    id,
    name: providerNames[id] ?? id,
  }));
}
