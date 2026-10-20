// @vitest-environment node

import ts from "typescript";
import { describe, expect, it } from "vitest";
import { sourceFile, sourceFiles } from "@tests/helpers/source-files";
import {
  localModulePath,
  moduleDependencies,
} from "@tests/helpers/architecture-imports";

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
    )
      return [];
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

const featureCatalogs = () =>
  sourceFiles("src/features").filter((path) =>
    /^src\/features\/[^/]+\/(?:rules|[^/]+-status|[^/]+-type|[^/]+-types|[^/]+-kind|[^/]+-template|user)\.ts$/.test(
      path,
    ),
  );

describe("feature catalog and display boundaries", () => {
  it("recognizes display declarations and named re-exports", () => {
    const source = ts.createSourceFile(
      "catalog.ts",
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

  it("keeps display options out of reusable business catalogs and rules", () => {
    const files = featureCatalogs();
    expect(files.length).toBeGreaterThan(10);
    expect(
      files.flatMap((path) =>
        displayExports(sourceFile(path)).map((name) => `${path}: ${name}`),
      ),
    ).toEqual([]);
  });

  it("prevents pure catalogs from importing or re-exporting presentation modules", () => {
    const violations = featureCatalogs().flatMap((path) =>
      moduleDependencies(sourceFile(path).text, path).flatMap(
        ({ specifier }) => {
          const target = localModulePath(path, specifier);
          return target &&
            (/^src\/components\//.test(target) ||
              /\/(?:admin|public|presentation)\//.test(target))
            ? [`${path} -> ${specifier}`]
            : [];
        },
      ),
    );
    expect(violations).toEqual([]);
  });
});
