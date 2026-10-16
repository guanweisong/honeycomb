// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { sourceFile, sourceFiles } from "@tests/helpers/source-files";

// Runtime schema exports are deliberate data contracts, not permission for
// providers, network queries or other executable UI to enter this boundary.
const schemaOwners = new Map([
  [
    "MediaRecordSchema",
    new Set(["@/features/media/application/repository", "./content"]),
  ],
  [
    "TagRecordSchema",
    new Set(["@/features/tag/application/repository", "./content"]),
  ],
]);

function invalidRuntimeExports(source: ts.SourceFile) {
  return source.statements.filter((node) => {
    if (!ts.isExportDeclaration(node)) return true;
    if (node.isTypeOnly) return false;
    if (!node.exportClause || !ts.isNamedExports(node.exportClause))
      return true;
    const owner =
      node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
        ? node.moduleSpecifier.text
        : "";
    return node.exportClause.elements.some(
      (element) =>
        !element.isTypeOnly &&
        (!schemaOwners.get(element.name.text)?.has(owner) ||
          (element.propertyName?.text ?? element.name.text) !==
            element.name.text),
    );
  });
}

describe("阅读路径与契约归属", () => {
  it("共享契约仅重新导出权威数据，不承载 React 或请求运行时", () => {
    for (const path of sourceFiles("src/features/contracts")) {
      const definitions = invalidRuntimeExports(sourceFile(path));
      expect(
        definitions.map((node) => node.getText()),
        path,
      ).toEqual([]);
    }
  });

  it("拒绝伪装成数据出口的 Provider、查询和任意运行时导出", () => {
    const source = ts.createSourceFile(
      "fixture.ts",
      [
        'export { CurrentUserProvider } from "@/packages/ui/admin/use-current-user";',
        'export { getCurrentUser } from "@/features/user/application/user-queries";',
        'export * from "@/features/contracts/admin/runtime";',
        'export { MediaRecordSchema } from "@/features/media/application/repository";',
        'export { type MediaRecord } from "@/features/media/application/repository";',
        'export type { CurrentUserRecord } from "@/features/user/application/repository";',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
    );
    expect(invalidRuntimeExports(source).map((node) => node.getText())).toEqual(
      [
        'export { CurrentUserProvider } from "@/packages/ui/admin/use-current-user";',
        'export { getCurrentUser } from "@/features/user/application/user-queries";',
        'export * from "@/features/contracts/admin/runtime";',
      ],
    );
  });

  it("纯别名展示文件不再隔开消费者和权威模型", () => {
    for (const feature of ["category", "link", "page", "post", "tag", "user"]) {
      expect(
        existsSync(
          `src/features/${feature}/presentation/${feature}-view-model.ts`,
        ),
        feature,
      ).toBe(false);
    }
  });

  it("评论展示不反向引用应用组合层", () => {
    for (const path of sourceFiles("src/features/comment/public")) {
      const dependencies = ts.preProcessFile(
        readFileSync(path, "utf8"),
        true,
        true,
      ).importedFiles;
      expect(
        dependencies.filter(({ fileName }) => fileName.startsWith("@/app/")),
        path,
      ).toEqual([]);
    }
  });
});
