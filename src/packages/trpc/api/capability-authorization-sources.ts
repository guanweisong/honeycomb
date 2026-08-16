import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** 读取生产 TypeScript 源码，供授权规则 AST 检查使用。 */
export function loadProductionSources(): Array<{
  fileName: string;
  source: string;
}> {
  const sourceRoot = join(process.cwd(), "src");
  const visitDirectory = (directoryPath: string): string[] =>
    readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) return visitDirectory(entryPath);
      if (!entry.name.match(/\.(?:ts|tsx)$/)) return [];
      if (entry.name.match(/\.(?:test|spec)\.(?:ts|tsx)$/)) return [];
      if (
        entry.name === "capability-authorization-static.ts" ||
        entry.name === "capability-authorization-sources.ts" ||
        entry.name === "capability-procedure-matrix-test-helpers.ts" ||
        entry.name === "capability-procedure-matrix-fixtures.ts"
      )
        return [];
      return [entryPath];
    });

  return visitDirectory(sourceRoot).map((filePath) => ({
    fileName: filePath.slice(process.cwd().length + 1),
    source: readFileSync(filePath, "utf8"),
  }));
}
