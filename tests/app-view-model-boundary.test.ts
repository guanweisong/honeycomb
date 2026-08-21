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

describe("App Router View Model 边界", () => {
  it("Blog 和 app server 组合层不直接依赖 tRPC output", () => {
    const roots = [
      join(process.cwd(), "src/app/(blog)"),
      join(process.cwd(), "src/app/lib"),
    ];
    const violations = roots.flatMap((root) =>
      sourceFiles(root)
        .filter((path) =>
          readFileSync(path, "utf8").includes("packages/trpc/api/outputs"),
        )
        .map((path) => relative(process.cwd(), path)),
    );

    expect(violations).toEqual([]);
  });
});
