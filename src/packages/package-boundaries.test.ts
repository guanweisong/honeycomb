import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import * as ts from "typescript";
import { sourceFiles } from "@tests/helpers/source-files";

const sourceRoot = join(process.cwd(), "src", "packages");

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

describe("package dependency boundaries", () => {
  it("keeps business router tests out of the tRPC infrastructure package", () => {
    expect(existsSync(join(sourceRoot, "trpc", "api", "modules"))).toBe(false);
  });

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

    expect(
      legacyLayers.filter((layer) => existsSync(join(sourceRoot, layer))),
    ).toEqual([]);
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
    const violations = ["identity", "infrastructure", "ui"].flatMap(
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

    expect(source).not.toMatch(/@\/env|upstash|rate-limit|server-only/);
  });

  it("keeps tRPC procedure-derived output contracts at the transport boundary", () => {
    expect(existsSync(join(sourceRoot, "trpc", "api", "modules"))).toBe(false);
  });
});
