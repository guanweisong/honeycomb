import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicVisibleRouters = [
  "src/features/post/post.router.ts",
  "src/features/page/page.router.ts",
  "src/features/comment/comment.router.ts",
  "src/features/category/category.router.ts",
  "src/features/tag/tag.router.ts",
  "src/features/menu/menu.router.ts",
  "src/features/setting/setting.router.ts",
  "src/features/user/user.router.ts",
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
        /await\s+publicContentInvalidator\.(?:invalidateContent|invalidateAll)/,
      );
    },
  );

  it("keeps notification, object storage, and rate-limit responsibilities at their boundaries", () => {
    const commentRouter = readFileSync(
      "src/features/comment/comment.router.ts",
      "utf8",
    );
    const commentCommands = readFileSync(
      "src/features/comment/application/comment-commands.ts",
      "utf8",
    );
    const mediaRouter = readFileSync(
      "src/features/media/media.router.ts",
      "utf8",
    );

    expect(commentRouter).not.toContain("sendCommentEmail");
    expect(commentRouter).toContain("commentCreateRatelimit");
    expect(commentCommands).not.toContain("commentCreateRatelimit");
    expect(mediaRouter).not.toMatch(/S3\.(?:deleteObjects|getPresignedUrl)/);
  });
});
