// @vitest-environment node

import ts from "typescript";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFile, sourceFiles } from "@tests/helpers/source-files";
import {
  moduleDependencies,
  resolveSourceModule,
} from "@tests/helpers/architecture-imports";
import { isDisplayContract } from "@tests/helpers/feature-inventory";

const featuresRoot = join(process.cwd(), "src/features");
const schemaPaths = sourceFiles(featuresRoot).filter((path) =>
  /\/(?:schema|[^/]+\.schema)\.ts$/.test(path),
);
const typePaths = sourceFiles(featuresRoot).filter((path) =>
  /^[^/]+\/types\/[^/]+\.ts$/.test(relative(featuresRoot, path)),
);
// This upload policy is a deliberately shared literal catalog, not a DTO.
const runtimeCatalogs = new Set(["media/types/media.upload-policy.ts"]);

function isEnumModule(file: ts.SourceFile): boolean {
  const first = file.statements[0];
  return file.statements.length === 1 && !!first && ts.isEnumDeclaration(first);
}

function isRuntimeCatalog(path: string): boolean {
  return (
    runtimeCatalogs.has(relative(featuresRoot, path)) ||
    isEnumModule(sourceFile(path))
  );
}

function schemaTypeViolations(path: string, source: string): string[] {
  return moduleDependencies(source, path).flatMap(({ specifier }) => {
    const target = resolveSourceModule(path, specifier);
    if (!target) return [];
    const absolute = resolve(target);
    if (!/^[^/]+\/types\//.test(relative(featuresRoot, absolute))) return [];
    return isDisplayContract(target) || !isRuntimeCatalog(absolute)
      ? [`${relative(featuresRoot, path)} -> ${specifier}`]
      : [];
  });
}

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
  it("catalog例外仅允许无导入的字面量常量，不可隐藏schema或服务端实现", () => {
    const file = sourceFile(
      resolve(featuresRoot, "media/types/media.upload-policy.ts"),
    );
    function isLiteral(node: ts.Expression): boolean {
      if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return true;
      if (ts.isArrayLiteralExpression(node))
        return node.elements.every(isLiteral);
      if (ts.isAsExpression(node))
        return (
          node.type.getText(file) === "const" && isLiteral(node.expression)
        );
      return (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.AsteriskToken &&
        isLiteral(node.left) &&
        isLiteral(node.right)
      );
    }
    expect(
      file.statements.every(
        (node) =>
          ts.isVariableStatement(node) &&
          !!(node.declarationList.flags & ts.NodeFlags.Const) &&
          node.declarationList.declarations.every(
            (declaration) =>
              !!declaration.initializer && isLiteral(declaration.initializer),
          ),
      ),
    ).toBe(true);
  });

  it("新目录中的枚举模块不被误判为DTO，混合schema仍被拒绝", () => {
    expect(isEnumModule(parse('export enum Status { READY = "READY" }'))).toBe(
      true,
    );
    expect(
      isEnumModule(
        parse(
          'export enum Status { READY = "READY" } export const Schema = {};',
        ),
      ),
    ).toBe(false);
    expect(
      parse('export enum Status { READY = "READY" }').statements.every(
        isPureTypeStatement,
      ),
    ).toBe(false);
  });

  it("运行时schema不导出静态类型，内部辅助类型不受影响", () => {
    expect(schemaPaths.length).toBeGreaterThan(0);
    expect(
      schemaPaths.filter((path) => path.includes("/schemas/")).length,
    ).toBeGreaterThan(0);
    expect(
      schemaPaths.flatMap((path) =>
        exportedTypes(sourceFile(path)).map(
          (name) => `${relative(featuresRoot, path)}:${name}`,
        ),
      ),
    ).toEqual([]);
  });

  it("types中的DTO文件仅包含类型声明和显式type-only依赖", () => {
    expect(typePaths.length).toBeGreaterThan(0);
    expect(
      typePaths
        .filter((path) => !isRuntimeCatalog(path))
        .flatMap((path) =>
          sourceFile(path)
            .statements.filter((node) => !isPureTypeStatement(node))
            .map((node) => `${relative(featuresRoot, path)}:${node.getText()}`),
        ),
    ).toEqual([]);
  });

  it("schema可以引用中立枚举和catalog，但不能反向依赖派生类型或展示枚举", () => {
    expect(
      schemaPaths.flatMap((path) =>
        schemaTypeViolations(path, sourceFile(path).text),
      ),
    ).toEqual([]);
  });

  it("拒绝跨模块 DTO、展示枚举和显式扩展名依赖", () => {
    const path = resolve(featuresRoot, "post/schemas/post.insert.schema.ts");
    expect(
      schemaTypeViolations(
        path,
        'import type { UserRecord } from "@/features/user/types/user.record";',
      ),
    ).toHaveLength(1);
    expect(
      schemaTypeViolations(
        path,
        'import { PageStatusName } from "@/features/page/types/page.status-name.ts";',
      ),
    ).toHaveLength(1);
    expect(
      schemaTypeViolations(
        path,
        'import { PageStatus } from "@/features/page/types/page.status.ts";',
      ),
    ).toEqual([]);
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
