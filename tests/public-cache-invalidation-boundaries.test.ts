import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicVisibleRouters = [
  "src/features/category/category.router.ts",
  "src/features/tag/tag.router.ts",
  "src/features/menu/menu.router.ts",
  "src/features/setting/setting.router.ts",
  "src/features/user/user.router.ts",
] as const;

describe("public cache invalidation boundaries", () => {
  it.each(publicVisibleRouters)(
    "%s invalidates public content after successful writes",
    (path) => {
      const source = readFileSync(path, "utf8");

      expect(source).toContain("invalidateAllPublicContent");
      expect(source).toMatch(
        /const result = await[\s\S]+await invalidateAllPublicContent\(\);[\s\S]+return result;/,
      );
    },
  );
});
