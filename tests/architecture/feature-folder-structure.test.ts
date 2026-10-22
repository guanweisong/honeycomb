// @vitest-environment node

import ts from "typescript";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sourceFile } from "@tests/helpers/source-files";
import { featureInventory } from "@tests/helpers/feature-inventory";

function enumNames(file: ts.SourceFile) {
  const names: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isEnumDeclaration(node)) names.push(node.name.text);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return names;
}

function enumViolations(path: string, file: ts.SourceFile) {
  const names = enumNames(file);
  if (!names.length) return [];
  return names.length !== 1 ||
    !/^src\/features\/[^/]+\/types\/[^/]+\.ts$/.test(path)
    ? [`${path}: ${names.join(", ")}`]
    : [];
}

describe("feature responsibility folders", () => {
  const features = featureInventory("src/features");
  const files = features.flatMap(({ files }) => files);

  it("does not restore flat contract/server entries or compatibility barrels", () => {
    expect(features.length).toBeGreaterThan(0);
    for (const { name } of features)
      for (const entry of [
        "types.ts",
        "schema.ts",
        "server.ts",
        "schema",
        "server.test.ts",
        "server.integration.test.ts",
      ])
        expect(existsSync(`src/features/${name}/${entry}`)).toBe(false);
    const contracts = files.filter((path) =>
      /\/(?:types|schemas)\/[^/]+\.ts$/.test(path),
    );
    expect(contracts.length).toBeGreaterThan(0);
    expect(
      contracts.filter((path) => path.includes("/schemas/")).length,
    ).toBeGreaterThan(0);
    expect(contracts.filter((path) => path.endsWith("/index.ts"))).toEqual([]);
    expect(
      contracts.flatMap((path) =>
        sourceFile(path)
          .statements.filter(
            (node) => ts.isExportDeclaration(node) && node.moduleSpecifier,
          )
          .map(() => path),
      ),
    ).toEqual([]);
  });

  it("keeps every feature enum in its own types file", () => {
    expect(
      files.flatMap((path) => enumNames(sourceFile(path))).length,
    ).toBeGreaterThan(0);
    expect(
      files.flatMap((path) => enumViolations(path, sourceFile(path))),
    ).toEqual([]);
  });

  it("rejects enums hidden in UI files or combined in one types file", () => {
    const parse = (text: string) =>
      ts.createSourceFile("fixture.ts", text, ts.ScriptTarget.Latest, true);
    const one = parse('export enum State { READY = "READY" }');
    expect(
      enumViolations("src/features/future/types/future.state.ts", one),
    ).toEqual([]);
    expect(
      enumViolations("src/features/future/admin/options.ts", one),
    ).toHaveLength(1);
    expect(
      enumViolations(
        "src/features/future/types/enums.ts",
        parse("enum A { X } enum B { Y }"),
      ),
    ).toHaveLength(1);
  });
});
