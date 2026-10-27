// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getConfiguredProviderIds,
  SOCIAL_PROVIDER_IDS,
  SOCIAL_PROVIDER_LABELS,
  type SocialProviderId,
} from "@/lib/auth/providers";

describe("social provider contract", () => {
  it("is client-safe and keeps provider labels stable", () => {
    expect(SOCIAL_PROVIDER_IDS).toEqual(["apple", "google", "github"]);
    expect(
      SOCIAL_PROVIDER_IDS.map(
        (id: SocialProviderId) => SOCIAL_PROVIDER_LABELS[id],
      ),
    ).toEqual(["Apple", "Google", "GitHub"]);
  });
  it("returns only configured social providers", () => {
    expect(
      getConfiguredProviderIds({
        apple: { clientId: "a", clientSecret: "a" },
        google: undefined,
        github: { clientId: "g", clientSecret: "g" },
      }),
    ).toEqual(["apple", "github"]);
  });
});
