import { getAuthEnv } from "@/env/server";
import { getConfiguredProviderIds } from "@/packages/auth/policy";

const providerNames: Record<string, string> = {
  apple: "Apple",
  google: "Google",
  github: "GitHub",
};

export function GET() {
  const env = getAuthEnv();

  return Response.json(
    getConfiguredProviderIds(env).map((id) => ({
      id,
      name: providerNames[id] ?? id,
    })),
  );
}
