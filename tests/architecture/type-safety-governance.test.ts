// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sourceFiles } from "@tests/helpers/source-files";

const featuresRoot = join(process.cwd(), "src", "features");
const sourceRoot = join(process.cwd(), "src");
const explicitUnsafeType =
  /(?:\bas\s+(?:any|never)\b|:\s*any\b|<any>|\bany\[\]|Record<[^>]*,\s*any>|no-explicit-any)/;

function featureContractFiles(): string[] {
  return sourceFiles(featuresRoot).filter((path) =>
    /\/(?:types|schemas|rules)\/[^/]+\.ts$/.test(path),
  );
}

describe("类型安全治理", () => {
  it("Post/Page command DTO 使用封闭且明确的字段类型", () => {
    const commandContracts = ["post", "page"].flatMap((feature) =>
      sourceFiles(`src/features/${feature}/schemas`).filter((path) =>
        /\.(?:fields|insert|update|delete)\.schema\.ts$/.test(path),
      ),
    );
    expect(commandContracts.length).toBeGreaterThan(0);
    const violations = commandContracts.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return /\bunknown\b|\[key:\s*string\]|Record<string|z\.(?:any|unknown|record)\s*\(/.test(
        source,
      )
        ? [path]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it("Post/Page command mapper 不使用整体 Drizzle model 断言", () => {
    const mapperFiles = sourceFiles(featuresRoot).filter((path) =>
      /features\/(?:post|page)\/server(?:\/|\.ts$)/.test(path),
    );
    expect(mapperFiles.length).toBeGreaterThan(1);
    const violations = mapperFiles.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return /\bas\s+(?:PostInsertValues|typeof\s+schema\.(?:post|page)\.\$inferInsert)\b/.test(
        source,
      )
        ? [path]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it("Feature 业务契约不使用显式 any 或规则抑制", () => {
    const violations = featureContractFiles().flatMap((path) => {
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
    const violations = sourceFiles(sourceRoot, {
      exclude: (path) =>
        /\.(?:test|spec)\.tsx?$/.test(path) ||
        path.endsWith("-test-helpers.ts"),
    }).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .flatMap((line, index) =>
          explicitUnsafeType.test(line)
            ? [`${relative(process.cwd(), path)}:${index + 1}`]
            : [],
        ),
    );

    expect(violations).toEqual([]);
  });

  it("生产源码中的双重断言必须标明第三方适配边界", () => {
    const violations = sourceFiles(sourceRoot, {
      exclude: (path) =>
        /\.(?:test|spec)\.tsx?$/.test(path) ||
        path.endsWith("-test-helpers.ts"),
    }).flatMap((path) => {
      const lines = readFileSync(path, "utf8").split("\n");
      return lines.flatMap((line, index) => {
        if (!/\bas\s+unknown\s+as\b/.test(line)) return [];
        const context = lines
          .slice(Math.max(0, index - 2), index + 1)
          .join("\n");
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

    const explicitAnyType =
      /(?:\bas\s+any\b|:\s*any\b|<any>|\bany\[\]|Record<[^>]*,\s*any>)/;

    expect(
      safeExamples.filter((source) => explicitAnyType.test(source)),
    ).toEqual([]);
  });
});
