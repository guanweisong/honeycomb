import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sourceFiles } from "@tests/helpers/source-files";

describe("feature View Model 边界", () => {
  it("feature 展示层不直接依赖 tRPC output", () => {
    const roots = ["link", "tag", "page", "user"].map((feature) =>
      join(process.cwd(), "src/features", feature),
    );
    const violations = roots.flatMap((root) =>
      sourceFiles(root, { includeTests: true })
        .filter((path) => /\/admin\/|\/presentation\//.test(path))
        .filter((path) =>
          readFileSync(path, "utf8").includes("packages/trpc/api/outputs"),
        )
        .map((path) => relative(process.cwd(), path)),
    );

    expect(violations).toEqual([]);
  });
});
