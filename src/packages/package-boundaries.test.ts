import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import * as ts from "typescript";

const sourceRoot = join(process.cwd(), "src", "packages");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)
      ? [path]
      : [];
  });
}

function importsMatching(directory: string, pattern: RegExp) {
  return sourceFiles(directory).flatMap((path) => {
    const source = readFileSync(path, "utf8");
    const sourceFile = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
      path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const matches: string[] = [];

    sourceFile.forEachChild((node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        pattern.test(node.moduleSpecifier.text)
      ) {
        matches.push(
          `${relative(process.cwd(), path)}: ${node.moduleSpecifier.text}`,
        );
      }
    });

    return matches;
  });
}

function filesMatching(directory: string, pattern: RegExp): string[] {
  return sourceFiles(directory)
    .map((path) => relative(process.cwd(), path))
    .filter((path) => pattern.test(path));
}

describe("package dependency boundaries", () => {
  it("uses the six stable package layers", () => {
    const legacyLayers = [
      "account-security",
      "auth",
      "db",
      "http",
      "notifications",
      "observability",
      "security",
    ];

    expect(legacyLayers.filter((layer) => existsSync(join(sourceRoot, layer)))).toEqual([]);
  });

  it("keeps domain independent from all other package layers", () => {
    expect(
      importsMatching(
        join(sourceRoot, "domain"),
        /@\/packages\/(identity|application|infrastructure|trpc|ui)/,
      ),
    ).toEqual([]);
  });

  it("keeps shared layers independent from App Router and tRPC transport modules", () => {
    const violations = ["identity", "application", "infrastructure", "ui"].flatMap(
      (directory) =>
        importsMatching(
          join(sourceRoot, directory),
          /@\/app|@\/packages\/trpc/,
        ),
    );

    expect(violations).toEqual([]);
  });

  it("keeps client IP parsing free of environment and rate-limit dependencies", () => {
    const source = readFileSync(
      join(sourceRoot, "infrastructure", "http", "client-ip.ts"),
      "utf8",
    );

    expect(
      source,
    ).not.toMatch(/@\/env|upstash|rate-limit|server-only/);
  });

  it("keeps tRPC procedure-derived output contracts at the transport boundary", () => {
    expect(
      filesMatching(
        join(sourceRoot, "trpc", "api", "modules"),
        /\.(entity|output)\.ts$/,
      ),
    ).toEqual([]);
  });
});
