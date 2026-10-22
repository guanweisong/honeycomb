// @vitest-environment node

import { requireDefined } from "@tests/helpers/require-defined";
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sourceFiles } from "@tests/helpers/source-files";

const sourceRoot = join(process.cwd(), "src");

function imports(source: string): string[] {
  return [
    ...new Set(
      [
        ...source.matchAll(/from\s+["']([^"']+)["']/g),
        ...source.matchAll(/import\s+["']([^"']+)["']/g),
        ...source.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g),
        ...source.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g),
      ].map((match) => requireDefined(match[1])),
    ),
  ];
}

describe("架构复杂度治理", () => {
  it("不保留无消费者 barrel 和测试专用源码", () => {
    const obsoleteFiles = [
      "src/app/(blog)/i18n/middleware.ts",
      "src/app/api/trpc/[trpc]/config.ts",
      "src/features/post/post-filters.ts",
      "src/lib/auth/migration.ts",
      "src/lib/content/parser/get-relation-tags.ts",
      "src/lib/db/array-field.ts",
      "src/lib/observability/adapters/memory.ts",
      "src/lib/observability/adapters/noop.ts",
      "src/lib/trpc/capability-authorization-sources.ts",
      "src/lib/trpc/capability-authorization-static.ts",
      "src/lib/trpc/capability-procedure-matrix-data.ts",
      "src/lib/trpc/capability-procedure-matrix-fixtures.ts",
      "src/lib/trpc/capability-procedure-matrix-test-helpers.ts",
      "src/components/ui/card.tsx",
      "src/app/admin/constants/admin-action-guard-matrix.ts",
      "src/features/comment/domain/index.ts",
      "src/features/page/domain/index.ts",
      "src/features/post/domain/index.ts",
      "src/features/user/domain/index.ts",
      "src/lib/db/index.ts",
      "src/lib/db/query/select-all-columns.ts",
      "src/lib/trpc/client/admin-query-client.ts",
      "src/lib/auth/authentication-events.ts",
      "src/packages/trpc/typings.d.ts",
      ...[
        "comment",
        "link",
        "media",
        "menu",
        "page",
        "post",
        "setting",
        "tag",
        "user",
      ].map(
        (feature) =>
          `src/features/${feature}/admin/constants/admin-action-guard.ts`,
      ),
      "src/lib/auth/admin-action-guard-types.ts",
      "src/lib/validation/i18n.schema.ts",
    ].filter((path) => existsSync(join(process.cwd(), path)));

    expect(obsoleteFiles).toEqual([]);
    // schemas/ now owns real definitions. The feature-folder-structure gate
    // rejects forwarding exports structurally instead of blacklisting these paths.
  });

  it("依赖清单只声明真实直接消费者并显式列出测试工具", () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      main?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const redundantDependencies = [
      "@radix-ui/react-checkbox",
      "@radix-ui/react-label",
      "@radix-ui/react-select",
      "@radix-ui/react-slot",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "drizzle-zod",
      "list-to-tree-lite",
      "autoprefixer",
      "bcryptjs",
    ].filter(
      (dependency) =>
        manifest.dependencies?.[dependency] !== undefined ||
        manifest.devDependencies?.[dependency] !== undefined,
    );

    expect(redundantDependencies).toEqual([]);
    expect(manifest.devDependencies).toMatchObject({
      "@serwist/build": expect.any(String),
      tinyglobby: expect.any(String),
    });
    expect(manifest.main).toBeUndefined();
  });

  it("Radix primitives 统一通过 radix-ui 聚合包导入", () => {
    const violations = sourceFiles(sourceRoot).flatMap((path) =>
      imports(readFileSync(path, "utf8"))
        .filter((specifier) => /^@radix-ui\/react-/.test(specifier))
        .map((specifier) => `${relative(process.cwd(), path)} -> ${specifier}`),
    );

    expect(violations).toEqual([]);
  });

  it("生产代码中的单文件行数不超过治理上限", () => {
    const oversized = sourceFiles(sourceRoot)
      .map((path) => ({
        path,
        lines: readFileSync(path, "utf8").split("\n").length,
      }))
      .filter(({ lines }) => lines > 600)
      .map(({ path, lines }) => `${relative(process.cwd(), path)} (${lines})`);

    expect(oversized).toEqual([]);
  });
});
