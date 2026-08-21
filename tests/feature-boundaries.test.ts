import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const featuresRoot = join(process.cwd(), "src/features");
const featureNames = [
  "comment",
  "post",
  "media",
  "link",
  "menu",
  "page",
  "setting",
  "tag",
  "user",
  "category",
] as const;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)
      ? [path]
      : [];
  });
}

describe("业务功能边界", () => {
  it("feature 生产代码只从 feature 目录导入业务 schema", () => {
    const violations = sourceFiles(featuresRoot).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return /@\/packages\/trpc\/api\/modules\/.+\/schemas\//.test(source)
        ? [relative(process.cwd(), path)]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it("共享公开契约不依赖普通 CRUD feature 的 service", () => {
    const source = readFileSync(
      join(featuresRoot, "contracts", "content.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /features\/(category|link|tag|page|media|menu|setting)\/service/,
    );
  });

  it("核心 feature 具备 domain、application 和 repository 边界", () => {
    for (const feature of ["post", "comment", "user"]) {
      expect(existsSync(join(featuresRoot, feature, "domain"))).toBe(true);
      expect(existsSync(join(featuresRoot, feature, "application"))).toBe(true);
      expect(existsSync(join(featuresRoot, feature, "application", "repository.ts"))).toBe(true);
    }
  });

  it("domain 不依赖 infrastructure 或数据库实现", () => {
    const violations = ["post", "comment", "user"].flatMap((feature) =>
      sourceFiles(join(featuresRoot, feature, "domain")).filter((path) =>
        /infrastructure\/|drizzle-orm|packages\/infrastructure/.test(
          readFileSync(path, "utf8"),
        ),
      ),
    );

    expect(violations).toEqual([]);
  });
  it("为业务提供仓储协议和按需的公开入口", () => {
    for (const feature of featureNames) {
      expect(
        statSync(join(featuresRoot, feature, "application")).isDirectory(),
      ).toBe(true);
      expect(
        statSync(join(featuresRoot, feature, "infrastructure")),
      ).toBeTruthy();
      if (["post", "comment", "user"].includes(feature)) {
        expect(statSync(join(featuresRoot, feature, "domain"))).toBeTruthy();
      }
    }
  });

  it("业务模块不重新引入历史分层目录", () => {
    for (const feature of featureNames) {
      for (const legacyDirectory of ["interfaces", "contracts"]) {
        expect(() =>
          statSync(join(featuresRoot, feature, legacyDirectory)),
        ).toThrow();
      }
    }
  });

  it("禁止 feature 直接导入其他 feature 的内部实现", () => {
    const violations = sourceFiles(featuresRoot).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return featureNames.flatMap((target) => {
        const current = featureNames.find((feature) =>
          path.includes(`/features/${feature}/`),
        );
        if (!current || current === target) return [];
        return new RegExp(
          `@/features/${target}/(application|transport|admin)/`,
        ).test(source)
          ? [`${relative(process.cwd(), path)} -> ${target}`]
          : [];
      });
    });

    expect(violations).toEqual([]);
  });

  it("禁止用例层直接依赖数据库实现", () => {
    const violations = sourceFiles(featuresRoot)
      .filter((path) => path.includes("/application/"))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        const imports = source.match(
          /from ["'](?:@\/packages\/infrastructure\/db|drizzle-orm)(?:[^"']*)["']/g,
        );
        return (imports ?? []).map(
          (specifier) => `${relative(process.cwd(), path)}: ${specifier}`,
        );
      });

    expect(violations).toEqual([]);
  });

  it("核心 feature 的 transport 使用 application 用例入口", () => {
    const violations = ["post", "comment", "user"].flatMap((feature) =>
      sourceFiles(join(featuresRoot, feature))
        .filter((path) => path.endsWith(".router.ts"))
        .filter((path) =>
          readFileSync(path, "utf8").includes(
            `features/${feature}/${feature}.service`,
          ),
        )
        .map((path) => relative(process.cwd(), path)),
    );

    expect(violations).toEqual([]);
  });
});
