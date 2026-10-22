// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicVisibleRouters = [
  "src/features/post/router.ts",
  "src/features/page/router.ts",
  "src/features/comment/router.ts",
  "src/features/category/router.ts",
  "src/features/link/router.ts",
  "src/features/tag/router.ts",
  "src/features/menu/router.ts",
  "src/features/setting/router.ts",
  "src/features/user/router.ts",
  "src/features/media/router.ts",
] as const;

describe("public cache invalidation boundaries", () => {
  it.each(publicVisibleRouters)(
    "%s only injects cache invalidation",
    (path) => {
      const source = readFileSync(path, "utf8");

      expect(source).toContain("publicContentInvalidator");
      expect(source).not.toMatch(
        /invalidatePublicContent|invalidateAllPublicContent/,
      );
      expect(source).not.toMatch(
        /publicContentInvalidator\s*\.\s*invalidate\s*\(/,
      );
    },
  );

  it("keeps notification, object storage, and rate-limit responsibilities at their boundaries", () => {
    const commentRouter = readFileSync(
      "src/features/comment/router.ts",
      "utf8",
    );
    const commentCommands = readFileSync(
      "src/features/comment/server/comment-commands.ts",
      "utf8",
    );
    const mediaRouter = readFileSync("src/features/media/router.ts", "utf8");

    expect(commentRouter).not.toContain("sendCommentEmail");
    expect(commentRouter).toContain("commentCreateRatelimit");
    expect(commentCommands).not.toContain("commentCreateRatelimit");
    expect(
      readFileSync("src/lib/rate-limit/rate-limit.ts", "utf8"),
    ).not.toMatch(
      /commentCreateRatelimit|ratelimit:comment-create|getClientIp/,
    );
    expect(mediaRouter).not.toMatch(
      /R2Storage\.(?:deleteObjects|getPresignedUrl)/,
    );
  });
});
