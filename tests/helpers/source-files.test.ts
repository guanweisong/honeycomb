import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFile, sourceFiles } from "./source-files";

describe("sourceFiles", () => {
  it("parses a TypeScript source file from disk", () => {
    const directory = mkdtempSync(join(tmpdir(), "honeycomb-source-file-"));
    try {
      const path = join(directory, "module.ts");
      writeFileSync(path, "export const value = 1;\n");

      expect(sourceFile(path).statements).toHaveLength(1);
    } finally {
      rmSync(directory, { recursive: true });
    }
  });

  it("recursively returns matching source files and applies exclusions", () => {
    const directory = mkdtempSync(join(tmpdir(), "honeycomb-source-files-"));
    try {
      mkdirSync(join(directory, "nested"));
      writeFileSync(join(directory, "root.ts"), "export {};\n");
      writeFileSync(join(directory, "nested", "view.tsx"), "export {};\n");
      writeFileSync(join(directory, "nested", "view.test.tsx"), "export {};\n");
      writeFileSync(join(directory, "notes.md"), "ignored\n");

      expect(
        sourceFiles(directory, {
          exclude: (path) => path.endsWith(".test.tsx"),
        }).map((path) => relative(directory, path)),
      ).toEqual(["nested/view.tsx", "root.ts"]);
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
