import packageJson from "../package.json";
import { describe, expect, it } from "vitest";

describe("Cloudflare middleware compatibility", () => {
  it("exposes a build smoke command that verifies the generated Worker artifacts", () => {
    expect(packageJson.scripts["test:cloudflare-build"]).toBe(
      "bun run build:cloudflare && bun scripts/verify-cloudflare-build.ts",
    );
  });
});
