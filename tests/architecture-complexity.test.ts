// @vitest-environment node

import { requireDefined } from "@tests/helpers/require-defined";
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { sourceFiles } from "@tests/helpers/source-files";

const sourceRoot = join(process.cwd(), "src");
const featureRoot = join(sourceRoot, "features");

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
  it("不保留无消费者 barrel、测试专用源码与 schema 转发文件", () => {
    const obsoleteFiles = [
      "src/features/comment/domain/index.ts",
      "src/features/page/domain/index.ts",
      "src/features/post/domain/index.ts",
      "src/features/user/domain/index.ts",
      "src/lib/db/index.ts",
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
      ...[
        ["page", "insert"],
        ["page", "update"],
        ["post", "insert"],
        ["post", "update"],
        ["category", "insert"],
        ["category", "update"],
        ["comment", "update"],
        ["user", "insert"],
        ["user", "update"],
        ["link", "insert"],
        ["link", "update"],
        ["menu", "update"],
        ["setting", "update"],
        ["tag", "insert"],
        ["tag", "update"],
        ["media", "insert"],
      ].map(
        ([feature, operation]) =>
          `src/features/${feature}/schemas/${feature}.${operation}.schema.ts`,
      ),
    ].filter((path) => existsSync(join(process.cwd(), path)));

    expect(obsoleteFiles).toEqual([]);
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

  it("业务生产代码不得直接导入数据库 schema 到展示层", () => {
    const violations = sourceFiles(featureRoot)
      .filter((path) => /\/admin\/|\/public\/|\/shared\//.test(path))
      .flatMap((path) =>
        imports(readFileSync(path, "utf8"))
          .filter((specifier) => /lib\/db\/schema/.test(specifier))
          .map(
            (specifier) => `${relative(process.cwd(), path)} -> ${specifier}`,
          ),
      );

    expect(violations).toEqual([]);
  });

  it("媒体共享 UI 不得直接依赖 tRPC output 类型", () => {
    const mediaSharedRoot = join(featureRoot, "media", "shared");
    const violations = sourceFiles(mediaSharedRoot).flatMap((path) =>
      imports(readFileSync(path, "utf8"))
        .filter((specifier) => specifier.includes("lib/trpc/outputs"))
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

  it("简单 feature 的 transport 不得继续直接依赖兼容 service 出口", () => {
    const simpleFeatures = [
      "category",
      "link",
      "menu",
      "page",
      "setting",
      "tag",
      "media",
    ];
    const violations = simpleFeatures.flatMap((feature) => {
      const router = join(featureRoot, feature, "router.ts");
      if (!statSync(router, { throwIfNoEntry: false })) return [];
      return imports(readFileSync(router, "utf8"))
        .filter((specifier) => specifier === `@/features/${feature}/service`)
        .map(
          (specifier) => `${relative(process.cwd(), router)} -> ${specifier}`,
        );
    });

    expect(violations).toEqual([]);
  });

  it("生产 schema 和模型不得依赖 Drizzle persistence model", () => {
    const violations = sourceFiles(featureRoot)
      .filter((path) => !/\/server(?:\/|\.ts$)/.test(path))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        const importsFromInfrastructure = imports(source).filter((specifier) =>
          /lib\/db\/schema|drizzle-zod/.test(specifier),
        );
        return importsFromInfrastructure.map(
          (specifier) => `${relative(process.cwd(), path)} -> ${specifier}`,
        );
      });
    expect(violations).toEqual([]);
  });
  it("业务文件按职责命名，不重建用例转发或层级包装", () => {
    const retired = sourceFiles(featureRoot).filter((path) =>
      /(?:-use-cases|-command-handlers|\/service)\.ts$/.test(path),
    );
    expect(retired).toEqual([]);
  });

  it("纯业务契约不泄漏传输类型", () => {
    const forbiddenType = /\b(?:Headers|Request|Response|FormData|TRPCError)\b/;
    const violations = sourceFiles(featureRoot)
      .filter((path) => /\/(?:schema|types|rules)\.ts$/.test(path))
      .filter((path) => forbiddenType.test(readFileSync(path, "utf8")))
      .map((path) => relative(process.cwd(), path));
    expect(violations).toEqual([]);
  });

  it("规则与技术模块不依赖业务 Router 或应用 UI", () => {
    const violations = sourceFiles(sourceRoot)
      .filter(
        (path) =>
          /\/rules\.ts$/.test(path) ||
          path.startsWith(join(sourceRoot, "lib") + "/"),
      )
      .flatMap((path) =>
        imports(readFileSync(path, "utf8"))
          .filter((specifier) =>
            /^@\/features\/[^/]+\/(?:[^/]+\.)?router$|^@\/app\/(?!_trpc\/router$)/.test(
              specifier,
            ),
          )
          .map(
            (specifier) => `${relative(process.cwd(), path)} -> ${specifier}`,
          ),
      );
    expect(violations).toEqual([]);
  });
});
