import { describe, expect, it } from "vitest";
import { getConfiguredProviderIds } from "@/packages/auth/policy";

describe("Better Auth integration", () => {
  it("keeps the supported social provider order stable", () => {
    expect(
      getConfiguredProviderIds({
        apple: { clientId: "apple-id", clientSecret: "apple-secret" },
        google: { clientId: "google-id", clientSecret: "google-secret" },
        github: { clientId: "github-id", clientSecret: "github-secret" },
      }),
    ).toEqual(["apple", "google", "github"]);
  });
});
