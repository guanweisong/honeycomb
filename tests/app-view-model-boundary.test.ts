// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sourceFiles } from "@tests/helpers/source-files";

describe("App Router View Model 边界", () => {
  it("Blog 和 app server 组合层不直接依赖 tRPC output", () => {
    const roots = [
      join(process.cwd(), "src/app/(blog)"),
      join(process.cwd(), "src/app/lib"),
    ];
    const violations = roots.flatMap((root) =>
      sourceFiles(root, { includeTests: true })
        .filter((path) =>
          /(?:lib\/trpc\/outputs|app\/_trpc\/router|inferRouterOutputs)/.test(
            readFileSync(path, "utf8"),
          ),
        )
        .map((path) => relative(process.cwd(), path)),
    );

    expect(violations).toEqual([]);
  });
});
