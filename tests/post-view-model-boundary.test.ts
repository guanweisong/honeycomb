import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sourceFiles } from "@tests/helpers/source-files";

describe("Post View Model 边界", () => {
  it("Post 展示层不直接依赖 tRPC output", () => {
    const root = join(process.cwd(), "src/features/post");
    const migratedPaths = [
      "/public/",
      "/presentation/",
      "/admin/edit/hooks/use-post-editor",
      "/admin/edit/components/PhotoPickerItem",
      "/admin/list/components/PostListClient",
      "/admin/list/constants/post-list-table-columns",
    ];
    const violations = sourceFiles(root, { includeTests: true })
      .filter((path) =>
        migratedPaths.some((fragment) => path.includes(fragment)),
      )
      .filter((path) =>
        readFileSync(path, "utf8").includes("packages/trpc/api/outputs"),
      )
      .map((path) => relative(process.cwd(), path));

    expect(violations).toEqual([]);
  });
});
