import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const sourceRoot = join(process.cwd(), "src");
const featureRoot = join(sourceRoot, "features");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)
      ? [path]
      : [];
  });
}

function imports(source: string): string[] {
  return [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

describe("架构复杂度治理", () => {
  it("所有 feature 都有明确的基础边界", () => {
    const features = readdirSync(featureRoot).filter((entry) =>
      statSync(join(featureRoot, entry)).isDirectory(),
    );

    expect(features).toEqual(
      expect.arrayContaining([
        "category",
        "comment",
        "link",
        "media",
        "menu",
        "page",
        "post",
        "setting",
        "tag",
        "user",
      ]),
    );

    for (const feature of features.filter((entry) => entry !== "contracts")) {
      expect(
        statSync(join(featureRoot, feature, "infrastructure")).isDirectory(),
      ).toBe(true);
    }
  });

  it("禁止 domain 和 infrastructure 反向依赖 transport", () => {
    const violations = sourceFiles(sourceRoot)
      .filter((path) => /\/domain\/|\/infrastructure\//.test(path))
      .flatMap((path) =>
        imports(readFileSync(path, "utf8"))
          .filter((specifier) =>
            /@\/app|@\/packages\/trpc\/(client|api)/.test(specifier),
          )
          .map(
            (specifier) => `${relative(process.cwd(), path)} -> ${specifier}`,
          ),
      );

    expect(violations).toEqual([]);
  });

  it("业务生产代码不得直接导入数据库 schema 到展示层", () => {
    const violations = sourceFiles(featureRoot)
      .filter((path) => /\/admin\/|\/public\/|\/shared\//.test(path))
      .flatMap((path) =>
        imports(readFileSync(path, "utf8"))
          .filter((specifier) =>
            /packages\/infrastructure\/db\/schema/.test(specifier),
          )
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
        .filter((specifier) => specifier.includes("packages/trpc/api/outputs"))
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
      const router = join(featureRoot, feature, `${feature}.router.ts`);
      if (!statSync(router, { throwIfNoEntry: false })) return [];
      return imports(readFileSync(router, "utf8"))
        .filter((specifier) => specifier === `@/features/${feature}/service`)
        .map(
          (specifier) => `${relative(process.cwd(), router)} -> ${specifier}`,
        );
    });

    expect(violations).toEqual([]);
  });

  it("Repository 契约必须位于 application，Application 不得依赖 infrastructure", () => {
    const rootRepositoryFiles = readdirSync(featureRoot).flatMap((feature) => {
      const path = join(featureRoot, feature, "repository.ts");
      return statSync(path, { throwIfNoEntry: false }) ? [relative(process.cwd(), path)] : [];
    });
    expect(rootRepositoryFiles).toEqual([]);

    const violations = sourceFiles(featureRoot)
      .filter((path) => /\/application\//.test(path))
      .flatMap((path) =>
        imports(readFileSync(path, "utf8"))
          .filter((specifier) => /\/infrastructure\//.test(specifier))
          .map((specifier) => `${relative(process.cwd(), path)} -> ${specifier}`),
      );
    expect(violations).toEqual([]);
  });

  it("业务 commands、queries、handlers 必须位于 application", () => {
    const violations = readdirSync(featureRoot).flatMap((feature) => {
      const directory = join(featureRoot, feature);
      if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) return [];
      return readdirSync(directory)
        .filter((entry) => /(?:commands|queries|handlers)\.ts$/.test(entry))
        .map((entry) => `${relative(process.cwd(), join(directory, entry))}`);
    });

    expect(violations).toEqual([]);
  });

  it("生产 schema 和模型不得依赖 Drizzle persistence model", () => {
    const violations = sourceFiles(featureRoot)
      .filter((path) => !/\/infrastructure\//.test(path))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        const importsFromInfrastructure = imports(source).filter((specifier) =>
          /packages\/infrastructure\/db\/schema|drizzle-zod/.test(specifier),
        );
        return importsFromInfrastructure.map(
          (specifier) => `${relative(process.cwd(), path)} -> ${specifier}`,
        );
      });
    expect(violations).toEqual([]);
  });
});
