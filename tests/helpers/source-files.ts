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

/** Stable filesystem enumeration; do not follow directory symlinks. */
export function filesInDirectory(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesInDirectory(path) : [path];
    })
    .sort();
}

/** Recursively returns TypeScript source files in a stable order. */
export function sourceFiles(
  directory: string,
  { exclude = () => false, includeTests = false }: SourceFileOptions = {},
): string[] {
  return filesInDirectory(directory).filter(
    (path) =>
      /\.tsx?$/.test(path) &&
      (includeTests || !/\.test\.(ts|tsx)$/.test(path)) &&
      !exclude(path),
  );
}
