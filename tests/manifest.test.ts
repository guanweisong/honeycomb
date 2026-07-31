import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("web app manifest", () => {
  it("does not import runtime services", async () => {
    const source = await readFile(
      join(process.cwd(), "src/app/manifest.ts"),
      "utf8",
    );

    expect(source).not.toContain("@/packages/trpc/api");
    expect(source).not.toContain("createServerClient");
  });
});
