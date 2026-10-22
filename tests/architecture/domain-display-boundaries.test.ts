// @vitest-environment node

import ts from "typescript";
import { describe, expect, it } from "vitest";
import { sourceFile, sourceFiles } from "@tests/helpers/source-files";
import {
  isAuthoritativeContract,
  isDisplayContract,
} from "@tests/helpers/feature-inventory";
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
  sourceFiles("src/features").filter(
    (path) =>
      (isAuthoritativeContract(path) && !isDisplayContract(path)) ||
      /\/rules\.ts$/.test(path),
  );

function presentationImports(path: string, source: string) {
  return moduleDependencies(source, path).flatMap(({ specifier }) => {
    const target = localModulePath(path, specifier);
    return target &&
      (/^src\/components\//.test(target) ||
        /\/(?:admin|public|presentation)\//.test(target) ||
        isDisplayContract(target))
      ? [`${path} -> ${specifier}`]
      : [];
  });
}

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

  it("prevents business contracts and operations from depending on presentation", () => {
    const catalogs = featureCatalogs();
    const files = sourceFiles("src/features").filter(
      (path) =>
        catalogs.includes(path) ||
        /\/(?:server|notifications)\//.test(path) ||
        /^src\/features\/[^/]+\/[^/]+\.ts$/.test(path),
    );
    expect(files.length).toBeGreaterThan(catalogs.length);
    expect(
      files.flatMap((path) => presentationImports(path, sourceFile(path).text)),
    ).toEqual([]);
  });

  it("rejects display enum dependencies from concrete server paths and re-exports", () => {
    const path = "src/features/post/server/post-commands.ts";
    expect(
      presentationImports(
        path,
        'import { PostStatusName } from "../types/post.status-name";',
      ),
    ).toHaveLength(1);
    expect(
      presentationImports(
        path,
        'export { Align } from "../types/post-info.align.ts";',
      ),
    ).toHaveLength(1);
    expect(
      presentationImports(
        path,
        'import { PageStatusName } from "@/features/page/types/page.status-name.ts";',
      ),
    ).toHaveLength(1);
    expect(
      presentationImports(
        path,
        'import { PostStatus } from "../types/post.status";',
      ),
    ).toEqual([]);
  });
});
