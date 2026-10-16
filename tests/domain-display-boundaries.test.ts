// @vitest-environment node

import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { sourceFile, sourceFiles } from "@tests/helpers/source-files";

function displayExports(source: ts.SourceFile): string[] {
  return source.statements.flatMap((statement) => {
    if (ts.isExportDeclaration(statement)) {
      return statement.exportClause && ts.isNamedExports(statement.exportClause)
        ? statement.exportClause.elements
            .map((element) => element.name.text)
            .filter((name) => /(?:Name|Options)$/.test(name))
        : [];
    }
    if (
      !ts.canHaveModifiers(statement) ||
      !ts
        .getModifiers(statement)
        ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      return [];
    }
    const names = ts.isEnumDeclaration(statement)
      ? [statement.name.text]
      : ts.isVariableStatement(statement)
        ? statement.declarationList.declarations.flatMap((declaration) =>
            ts.isIdentifier(declaration.name) ? [declaration.name.text] : [],
          )
        : [];
    return names.filter((name) => /(?:Name|Options)$/.test(name));
  });
}

describe("domain display boundaries", () => {
  it("recognizes display declarations and named re-exports", () => {
    const source = ts.createSourceFile(
      "domain.ts",
      [
        'export enum PostStatusName { DRAFT = "草稿" }',
        "export const postStatusOptions = [];",
        'export { MenuTypeName } from "./menu";',
        'export enum PostStatus { DRAFT = "DRAFT" }',
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
    );
    expect(displayExports(source)).toEqual([
      "PostStatusName",
      "postStatusOptions",
      "MenuTypeName",
    ]);
  });

  it("does not export UI display names or options from domain modules", () => {
    const violations = sourceFiles("src/packages/domain").flatMap((path) =>
      displayExports(sourceFile(path)).map((name) => `${path}: ${name}`),
    );
    expect(violations).toEqual([]);
  });

  it("does not import or re-export UI modules from domain", () => {
    const violations = sourceFiles("src/packages/domain").flatMap((path) =>
      ts
        .preProcessFile(sourceFile(path).text, true, true)
        .importedFiles.flatMap(({ fileName }) => {
          const importedPath = fileName.startsWith("@/")
            ? join("src", fileName.slice(2))
            : fileName.startsWith(".")
              ? relative(process.cwd(), resolve(dirname(path), fileName))
              : fileName;
          return importedPath
            .replaceAll("\\", "/")
            .startsWith("src/packages/ui/")
            ? [`${path} -> ${fileName}`]
            : [];
        }),
    );
    expect(violations).toEqual([]);
  });
});
