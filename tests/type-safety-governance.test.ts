import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const featuresRoot = join(process.cwd(), "src", "features");
const sourceRoot = join(process.cwd(), "src");
const explicitUnsafeType = /(?:\bas\s+(?:any|never)\b|:\s*any\b|<any>|\bany\[\]|Record<[^>]*,\s*any>|no-explicit-any)/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry) || /\.(?:test|spec)\.tsx?$/.test(entry)) return [];
    if (entry.endsWith("-test-helpers.ts")) return [];
    return [path];
  });
}

function applicationRepositoryFiles(): string[] {
  return readdirSync(featuresRoot).flatMap((feature) => {
    const applicationDirectory = join(featuresRoot, feature, "application");
    if (!statSync(applicationDirectory, { throwIfNoEntry: false })?.isDirectory()) {
      return [];
    }

    return readdirSync(applicationDirectory)
      .filter((entry) => /repository\.ts$/.test(entry))
      .map((entry) => join(applicationDirectory, entry));
  });
}

describe("类型安全治理", () => {
  it("Application Repository 契约不使用显式 any 或规则抑制", () => {
    const violations = applicationRepositoryFiles().flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const lines = source.split("\n");

      return lines.flatMap((line, index) =>
        explicitUnsafeType.test(line)
          ? [`${relative(process.cwd(), path)}:${index + 1}`]
          : [],
      );
    });

    expect(violations).toEqual([]);
  });

  it("生产源码不使用显式 any、as never 或对应规则抑制", () => {
    const violations = sourceFiles(sourceRoot).flatMap((path) =>
      readFileSync(path, "utf8").split("\n").flatMap((line, index) =>
        explicitUnsafeType.test(line)
          ? [`${relative(process.cwd(), path)}:${index + 1}`]
          : [],
      ),
    );

    expect(violations).toEqual([]);
  });

  it("生产源码中的双重断言必须标明第三方适配边界", () => {
    const violations = sourceFiles(sourceRoot).flatMap((path) => {
      const lines = readFileSync(path, "utf8").split("\n");
      return lines.flatMap((line, index) => {
        if (!/\bas\s+unknown\s+as\b/.test(line)) return [];
        const context = lines.slice(Math.max(0, index - 2), index + 1).join("\n");
        return context.includes("适配边界")
          ? []
          : [`${relative(process.cwd(), path)}:${index + 1}`];
      });
    });

    expect(violations).toEqual([]);
  });

  it("不会把合法字面量窄化和测试 API 当作类型逃逸", () => {
    const safeExamples = [
      "const value = { enabled: true } as const;",
      "expect(value).toEqual(expect.any(String));",
      'import { Image as ImageIcon } from "lucide-react";',
    ];

    const explicitAnyType = /(?:\bas\s+any\b|:\s*any\b|<any>|\bany\[\]|Record<[^>]*,\s*any>)/;

    expect(safeExamples.filter((source) => explicitAnyType.test(source))).toEqual([]);
  });
});
