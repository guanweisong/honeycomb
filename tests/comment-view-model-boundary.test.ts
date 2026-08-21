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

describe("Comment View Model 边界", () => {
  it("Comment 展示层不直接依赖 tRPC output", () => {
    const root = join(process.cwd(), "src/features/comment");
    const violations = sourceFiles(root)
      .filter((path) => /\/admin\/|\/public\/|\/presentation\//.test(path))
      .filter((path) =>
        readFileSync(path, "utf8").includes("packages/trpc/api/outputs"),
      )
      .map((path) => relative(process.cwd(), path));

    expect(violations).toEqual([]);
  });
});
