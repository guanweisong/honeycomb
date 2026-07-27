import { access } from "node:fs/promises";
import { constants } from "node:fs";
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
});
