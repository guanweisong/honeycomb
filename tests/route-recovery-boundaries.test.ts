import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { describe, expect, it } from "vitest";

const requiredBoundaries = [
  "src/app/(blog)/loading.tsx",
  "src/app/(blog)/error.tsx",
  "src/app/admin/loading.tsx",
  "src/app/admin/error.tsx",
  "src/app/global-error.tsx",
] as const;

describe("route recovery boundaries", () => {
  it("provides public, admin, and global recovery boundaries", async () => {
    await Promise.all(
      requiredBoundaries.map((path) => expect(access(path, constants.R_OK)).resolves.toBeUndefined()),
    );
  });

  it("does not render raw error messages", async () => {
    const contents = await Promise.all(requiredBoundaries.map((path) => readFile(path, "utf8")));

    expect(contents.join("\n")).not.toMatch(/error\.message|String\(error\)/);
  });
});
