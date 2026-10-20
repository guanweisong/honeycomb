// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  moduleDependencies,
  runtimeDependencyViolations,
} from "@tests/helpers/architecture-imports";

const read = (path: string) => readFileSync(path, "utf8");

describe("shared helper ownership", () => {
  it("derives the picker cover from media, not post", () => {
    const path = "src/features/media/components/PhotoPickerItem/index.tsx";
    const source = read(path);
    expect(moduleDependencies(source, path)).toContainEqual({
      specifier: "@/features/media/types",
      typeOnly: true,
    });
    expect(source).not.toContain("@/features/post/types");
  });

  it.each([
    ["src/lib/db/query/tools.ts", "src/lib/db/query/query-builders.ts"],
    ["src/components/blog/utc-format.ts", "src/lib/ui/utc-format.ts"],
    [
      "src/lib/content/parser/get-all-image-link-form-html.ts",
      "src/lib/content/image-links.ts",
    ],
    [
      "src/components/Menu/components/MenuTitle/index.tsx",
      "src/components/Menu/MenuTitle.tsx",
    ],
  ])("replaces %s with its direct owned path", (previous, current) => {
    expect(existsSync(previous)).toBe(false);
    expect(existsSync(current)).toBe(true);
  });

  it("keeps category tree traversal free of database dependencies", () => {
    expect(existsSync("src/features/category/tree.ts")).toBe(true);
    const path = "src/features/category/tree.ts";
    const isDatabaseRuntime = (file: string, source: string) =>
      file.startsWith("src/lib/db/") ||
      moduleDependencies(source, file).some(
        ({ specifier, typeOnly }) =>
          !typeOnly &&
          /^(?:drizzle-orm(?:\/|$)|@libsql\/|server-only$)/.test(specifier),
      );
    expect(isDatabaseRuntime(path, read(path))).toBe(false);
    expect(runtimeDependencyViolations(path, isDatabaseRuntime)).toEqual([]);
    expect(read("src/lib/db/query/query-builders.ts")).not.toContain(
      "sonsTree",
    );
  });

  it("uses only a type import for the MenuItem contract", () => {
    expect(existsSync("src/components/Menu/MenuTitle.tsx")).toBe(true);
    const path = "src/components/Menu/MenuTitle.tsx";
    expect(moduleDependencies(read(path), path)).toContainEqual({
      specifier: "./index",
      typeOnly: true,
    });
  });
});
