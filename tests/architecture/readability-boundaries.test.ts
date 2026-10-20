// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sourceFiles } from "@tests/helpers/source-files";
import {
  localModulePath,
  moduleDependencies,
} from "@tests/helpers/architecture-imports";

describe("direct reading paths and contract ownership", () => {
  it("consumers reach feature-owned contracts without a central forwarding layer", () => {
    expect(existsSync("src/features/contracts")).toBe(false);
    const violations = sourceFiles("src").flatMap((path) =>
      moduleDependencies(readFileSync(path, "utf8"), path)
        .filter(({ specifier }) =>
          localModulePath(path, specifier)?.startsWith(
            "src/features/contracts",
          ),
        )
        .map(({ specifier }) => `${path} -> ${specifier}`),
    );
    expect(violations).toEqual([]);
  });

  it("does not retain trivial presentation aliases between consumers and authoritative models", () => {
    for (const feature of ["category", "link", "page", "post", "tag", "user"]) {
      expect(
        existsSync(
          `src/features/${feature}/presentation/${feature}-view-model.ts`,
        ),
        feature,
      ).toBe(false);
    }
  });
});
