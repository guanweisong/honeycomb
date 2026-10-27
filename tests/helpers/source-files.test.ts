import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFile, sourceFiles } from "@tests/helpers/source-files";

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

it("preserves hidden paths, test/spec distinction, symbolic entries and missing-root failures", () => {
  const directory = mkdtempSync(join(tmpdir(), "honeycomb-source-links-"));
  try {
    mkdirSync(join(directory, ".hidden"));
    writeFileSync(join(directory, ".hidden", "a.ts"), "export {};");
    for (const name of ["b.ts", "b.spec.ts", "b.test.tsx"])
      writeFileSync(join(directory, name), "export {};");
    symlinkSync(".hidden", join(directory, "linked-directory"));
    symlinkSync("b.ts", join(directory, "link.ts"));
    symlinkSync("missing", join(directory, "dangling.ts"));
    expect(
      sourceFiles(directory).map((path) => relative(directory, path)),
    ).toEqual([".hidden/a.ts", "b.spec.ts", "b.ts", "dangling.ts", "link.ts"]);
    expect(
      sourceFiles(directory, { includeTests: true }).map((path) =>
        relative(directory, path),
      ),
    ).toContain("b.test.tsx");
    expect(
      sourceFiles(directory, { exclude: (path) => path.endsWith("b.ts") }),
    ).not.toContain(join(directory, "b.ts"));
    expect(() => sourceFiles(join(directory, "missing-root"))).toThrow();
    writeFileSync(join(directory, "new.ts"), "export {};");
    expect(sourceFiles(directory)).toContain(join(directory, "new.ts"));
  } finally {
    rmSync(directory, { recursive: true });
  }
});
