// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { createValidFileMatcher } from "next/dist/server/lib/find-page-file";
import { moduleDependencies } from "@tests/helpers/architecture-imports";
import { filesInDirectory, sourceFile } from "@tests/helpers/source-files";

function directives(path: string) {
  return sourceFile(path).statements.flatMap((node) =>
    ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)
      ? [node.expression.text]
      : [],
  );
}

describe("component ownership", () => {
  it("keeps route-local, shared and business UI at their owned paths", () => {
    const moves = [
      ["src/app/(blog)/_components", "src/app/(blog)/components"],
      ["src/app/admin/_components", "src/app/admin/components"],
      [
        "src/app/admin/(dashboard)/_components",
        "src/app/admin/(dashboard)/components",
      ],
      [
        "src/app/(blog)/components/NoData",
        "src/app/(blog)/[locale]/list/[...slug]/components/NoData/index.tsx",
      ],
      [
        "src/app/(blog)/[locale]/list/[...slug]/_components",
        "src/app/(blog)/[locale]/list/[...slug]/components",
      ],
      ["src/app/_auth", "src/app/auth"],
      ["src/app/_trpc", "src/app/trpc"],
      ["src/app/_pwa", "src/app/pwa"],
      ["src/components/blog/Card", "src/components/SectionCard/index.tsx"],
      [
        "src/components/blog/TextDivider",
        "src/features/post/public/components/PostList/TextDivider.tsx",
      ],
      [
        "src/components/admin/MultiLangText",
        "src/components/MultiLangText/index.tsx",
      ],
      ["src/components/admin/date-time.ts", "src/lib/ui/admin-date-time.ts"],
      [
        "src/features/media/components",
        "src/features/media/admin/components/EditorMediaProvider/index.tsx",
      ],
      ["src/features/media/shared", "src/features/media/admin/media-query.ts"],
    ] as const;
    for (const [previous, current] of moves) {
      expect(existsSync(previous), previous).toBe(false);
      expect(existsSync(current), current).toBe(true);
    }
  });

  it.each([
    "src/app/(blog)/components",
    "src/app/(blog)/[locale]/list/[...slug]/components",
    "src/app/admin/components",
    "src/app/admin/(dashboard)/components",
    "src/app/auth",
    "src/app/trpc",
    "src/app/pwa",
  ])("keeps %s non-routable without a private-folder prefix", (directory) => {
    expect(existsSync(directory), directory).toBe(true);
    const { isAppRouterPage } = createValidFileMatcher(
      ["tsx", "ts", "jsx", "js"],
      "src/app",
    );
    expect(filesInDirectory(directory).filter(isAppRouterPage)).toEqual([]);
  });

  it("preserves server-compatible cards and the explicit interactive entry", () => {
    expect(directives("src/components/SectionCard/index.tsx")).not.toContain(
      "use client",
    );
    expect(directives("src/components/MultiLangText/index.tsx")).toContain(
      "use client",
    );
    const provider =
      "src/features/media/admin/components/EditorMediaProvider/index.tsx";
    expect(
      moduleDependencies(readFileSync(provider, "utf8"), provider),
    ).toContainEqual({
      specifier: "@/components/editor/media-picker",
      typeOnly: false,
    });
  });

  it.each(["post", "page"])(
    "keeps %s publication display tied to its own state contract",
    (feature) => {
      const path = `src/features/${feature}/admin/publication-status-tone.ts`;
      const dependencies = moduleDependencies(readFileSync(path, "utf8"), path);
      expect(dependencies).toContainEqual({
        specifier: `@/features/${feature}/types/${feature}.status`,
        typeOnly: false,
      });
      expect(
        dependencies.filter(({ specifier }) =>
          specifier.startsWith("@/features/"),
        ),
      ).toHaveLength(1);
      expect(
        existsSync("src/components/admin/publication-status-tone.ts"),
      ).toBe(false);
    },
  );
});
