import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

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
    const violations = sourceFiles(root)
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
