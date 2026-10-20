// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sourceFiles } from "@tests/helpers/source-files";

describe("Comment View Model 边界", () => {
  it("Comment 展示层不直接依赖 tRPC output", () => {
    const root = join(process.cwd(), "src/features/comment");
    const violations = sourceFiles(root, { includeTests: true })
      .filter((path) => /\/admin\/|\/public\/|\/presentation\//.test(path))
      .filter((path) =>
        /(?:lib\/trpc\/outputs|app\/_trpc\/router|inferRouterOutputs)/.test(
          readFileSync(path, "utf8"),
        ),
      )
      .map((path) => relative(process.cwd(), path));

    expect(violations).toEqual([]);
  });
});
