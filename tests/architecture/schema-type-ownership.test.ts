// @vitest-environment node

import ts from "typescript";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFile, sourceFiles } from "@tests/helpers/source-files";

const featuresRoot = join(process.cwd(), "src/features");
const schemaPaths = sourceFiles(featuresRoot).filter((path) =>
  /\/(?:schema|[^/]+\.schema)\.ts$/.test(path),
);
const typePaths = sourceFiles(featuresRoot).filter((path) =>
  /^[^/]+\/types\.ts$/.test(relative(featuresRoot, path)),
);

function exportedTypes(file: ts.SourceFile): string[] {
  const localTypes = new Set(
    file.statements.flatMap((node) =>
      ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)
        ? [node.name.text]
        : [],
    ),
  );
  return file.statements.flatMap((node) => {
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      return node.modifiers?.some(
        (item) => item.kind === ts.SyntaxKind.ExportKeyword,
      )
        ? [node.name.text]
        : [];
    }
    if (!ts.isExportDeclaration(node)) return [];
    if (node.isTypeOnly) return [node.getText(file)];
    if (!node.exportClause || !ts.isNamedExports(node.exportClause)) return [];
    return node.exportClause.elements.flatMap((item) =>
      item.isTypeOnly || localTypes.has((item.propertyName ?? item.name).text)
        ? [item.name.text]
        : [],
    );
  });
}

function isPureTypeStatement(node: ts.Statement): boolean {
  if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node))
    return true;
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    return (
      !!clause &&
      (clause.isTypeOnly ||
        (!clause.name &&
          !!clause.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.every((item) => item.isTypeOnly)))
    );
  }
  if (ts.isExportDeclaration(node)) {
    return (
      node.isTypeOnly ||
      (!!node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.every((item) => item.isTypeOnly))
    );
  }
  return false;
}

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile(
    "fixture.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
}

describe("Feature schema/type ownership", () => {
  it("运行时schema不导出静态类型，内部辅助类型不受影响", () => {
    expect(schemaPaths.length).toBeGreaterThan(0);
    expect(
      schemaPaths.flatMap((path) =>
        exportedTypes(sourceFile(path)).map(
          (name) => `${relative(featuresRoot, path)}:${name}`,
        ),
      ),
    ).toEqual([]);
  });

  it("已有feature types入口仅包含类型声明和显式type-only依赖", () => {
    expect(typePaths.length).toBeGreaterThan(0);
    expect(
      typePaths.flatMap((path) =>
        sourceFile(path)
          .statements.filter((node) => !isPureTypeStatement(node))
          .map((node) => `${relative(featuresRoot, path)}:${node.getText()}`),
      ),
    ).toEqual([]);
  });

  it("schema不反向依赖所属feature的types入口", () => {
    const violations: string[] = [];
    for (const path of schemaPaths) {
      const feature = relative(featuresRoot, path).split("/")[0];
      if (!feature) throw new Error(`Missing feature for ${path}`);
      const ownTypes = resolve(featuresRoot, feature, "types");
      const visit = (node: ts.Node): void => {
        const specifier =
          ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
            ? node.moduleSpecifier
            : ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)
              ? node.argument.literal
              : undefined;
        if (specifier && ts.isStringLiteral(specifier)) {
          const target = specifier.text.startsWith("@/")
            ? resolve(process.cwd(), "src", specifier.text.slice(2))
            : resolve(dirname(path), specifier.text);
          if (target.replace(/\.ts$/, "") === ownTypes)
            violations.push(relative(featuresRoot, path));
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile(path));
    }
    expect(violations).toEqual([]);
  });

  it("门禁识别声明及转导出，允许schema内部辅助类型", () => {
    expect(
      exportedTypes(parse("type Internal = string; export const Schema = {};")),
    ).toEqual([]);
    expect(
      exportedTypes(
        parse("export type Output = string; export interface Input {}"),
      ),
    ).toEqual(["Output", "Input"]);
    expect(
      exportedTypes(parse('export type { Output } from "./types";')),
    ).toHaveLength(1);
    expect(
      exportedTypes(
        parse("type Output = string; export { Output as Renamed };"),
      ),
    ).toEqual(["Renamed"]);
    expect(
      exportedTypes(parse('export { type Output } from "./types";')),
    ).toEqual(["Output"]);
  });

  it("门禁拒绝types中的运行时schema和隐式值依赖", () => {
    expect(
      parse(
        'import type { z } from "zod"; export type Output = string;',
      ).statements.every(isPureTypeStatement),
    ).toBe(true);
    expect(
      parse('import { type z } from "zod";').statements.every(
        isPureTypeStatement,
      ),
    ).toBe(true);
    for (const source of [
      'import { z } from "zod";',
      'import "./setup";',
      "export const Schema = {};",
      'export { Schema } from "./schema";',
    ]) {
      expect(parse(source).statements.every(isPureTypeStatement), source).toBe(
        false,
      );
    }
  });
});
