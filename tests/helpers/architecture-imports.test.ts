// @vitest-environment node

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import {
  moduleDependencies,
  runtimeDependencyViolations,
} from "@tests/helpers/architecture-imports";

vi.mock("typescript", async (importOriginal) => {
  const actual = await importOriginal<typeof import("typescript")>();
  return {
    ...actual,
    default: {
      ...actual,
      createSourceFile: vi.fn(actual.createSourceFile),
    },
  };
});

describe("dependency scan reuse", () => {
  it("parses unchanged source once without sharing mutable results", () => {
    const source = 'import { value } from "./shared";';
    const parses = vi.mocked(ts.createSourceFile);
    parses.mockClear();
    const first = moduleDependencies(source, "reuse.ts");
    expect(first).toEqual([{ specifier: "./shared", typeOnly: false }]);
    requireDefined(first[0]).specifier = "./mutated";
    first.push({ specifier: "./extra", typeOnly: true });
    expect(moduleDependencies(source, "reuse.ts")).toEqual([
      { specifier: "./shared", typeOnly: false },
    ]);
    expect(parses).toHaveBeenCalledTimes(1);
  });

  it("reparses changes at the same path and retains import order and kinds", () => {
    expect(moduleDependencies('import "./before";', "changed.ts")).toEqual([
      { specifier: "./before", typeOnly: false },
    ]);
    expect(
      moduleDependencies(
        [
          'import type { T } from "./types";',
          'export { value } from "./after";',
          'const lazy = import("./dynamic");',
          'const native = require("node:fs");',
        ].join("\n"),
        "changed.ts",
      ),
    ).toEqual([
      { specifier: "./types", typeOnly: true },
      { specifier: "./after", typeOnly: false },
      { specifier: "./dynamic", typeOnly: false },
      { specifier: "node:fs", typeOnly: false },
    ]);
  });

  it("does not reuse a parse across different file kinds", () => {
    const source = "const view = <View />;";
    const parses = vi.mocked(ts.createSourceFile);
    parses.mockClear();
    moduleDependencies(source, "kind.ts");
    moduleDependencies(source, "kind.tsx");
    expect(parses).toHaveBeenCalledTimes(2);
    expect(parses.mock.calls.map((call) => call[4])).toEqual([
      ts.ScriptKind.TS,
      ts.ScriptKind.TSX,
    ]);
  });

  it("evicts old parses rather than retaining every fixture forever", () => {
    const source = 'import "./bounded";';
    moduleDependencies(source, "evicted.ts");
    for (let index = 0; index < 1024; index++)
      moduleDependencies(source, `bounded-${index}.ts`);
    const parses = vi.mocked(ts.createSourceFile);
    parses.mockClear();
    expect(moduleDependencies(source, "evicted.ts")).toEqual([
      { specifier: "./bounded", typeOnly: false },
    ]);
    expect(parses).toHaveBeenCalledTimes(1);
  });

  it("observes dependency edits and deleted files between graph scans", () => {
    const directory = mkdtempSync(join(tmpdir(), "honeycomb-dependency-scan-"));
    try {
      const entry = join(directory, "entry.ts");
      const dependency = join(directory, "dependency.ts");
      writeFileSync(entry, 'import "./dependency";');
      writeFileSync(dependency, 'import "safe:ok";');
      const forbidden = (path: string, source: string) =>
        moduleDependencies(source, path).some(
          ({ specifier }) => specifier === "node:fs",
        );
      expect(runtimeDependencyViolations(entry, forbidden)).toEqual([]);
      // Same-size edits must invalidate even when timestamp precision is coarse.
      writeFileSync(dependency, 'import "node:fs";');
      expect(runtimeDependencyViolations(entry, forbidden)).toEqual([
        `${entry} -> ${relative(process.cwd(), dependency)}`,
      ]);
      rmSync(dependency);
      expect(runtimeDependencyViolations(entry, forbidden)).toEqual([]);
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
