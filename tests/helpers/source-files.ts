import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

export interface SourceFileOptions {
  exclude?: (path: string) => boolean;
  includeTests?: boolean;
}

/** Parses a TypeScript source file from disk for structural assertions. */
export function sourceFile(path: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

/** Recursively returns TypeScript source files in a stable order. */
export function sourceFiles(
  directory: string,
  { exclude = () => false, includeTests = false }: SourceFileOptions = {},
): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory())
        return sourceFiles(path, { exclude, includeTests });
      const isTest = /\.test\.(ts|tsx)$/.test(entry.name);
      return /\.tsx?$/.test(entry.name) &&
        (includeTests || !isTest) &&
        !exclude(path)
        ? [path]
        : [];
    })
    .sort();
}
