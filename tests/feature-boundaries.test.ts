import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
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
  it("为核心业务提供 application、transport、admin 和 public 入口", () => {
    for (const feature of featureNames) {
      for (const area of ["application", "transport", "admin", "public"]) {
        expect(statSync(join(featuresRoot, feature, area, "index.ts"))).toBeTruthy();
      }
    }
  });

  it("禁止 feature 直接导入其他 feature 的内部实现", () => {
    const violations = sourceFiles(featuresRoot).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return featureNames.flatMap((target) => {
        const current = featureNames.find((feature) => path.includes(`/features/${feature}/`));
        if (!current || current === target) return [];
        return new RegExp(`@/features/${target}/(application|transport|admin)/`).test(source)
          ? [`${relative(process.cwd(), path)} -> ${target}`]
          : [];
      });
    });

    expect(violations).toEqual([]);
  });

  it("禁止 application 直接依赖数据库实现", () => {
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
});
