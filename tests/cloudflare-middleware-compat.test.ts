import { access } from "node:fs/promises";
import { constants } from "node:fs";
import packageJson from "../package.json";
import { describe, expect, it } from "vitest";

async function exists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe("Cloudflare middleware compatibility", () => {
  it("uses the Edge middleware convention instead of the Node-only proxy convention", async () => {
    await expect(exists("src/middleware.ts")).resolves.toBe(true);
    await expect(exists("src/proxy.ts")).resolves.toBe(false);
  });

  it("exposes a build smoke command that verifies the generated Worker artifacts", () => {
    expect(packageJson.scripts["test:cloudflare-build"]).toBe(
      "bun run build:cloudflare && bun scripts/verify-cloudflare-build.ts",
    );
  });
});
