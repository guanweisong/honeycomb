import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sourceFiles } from "./source-files";

/** 读取生产 TypeScript 源码，供授权规则 AST 检查使用。 */
export function loadProductionSources(): Array<{
  fileName: string;
  source: string;
}> {
  const sourceRoot = join(process.cwd(), "src");
  return sourceFiles(sourceRoot, {
    exclude: (path) => /\.spec\.(ts|tsx)$/.test(path),
  }).map((filePath) => ({
    fileName: filePath.slice(process.cwd().length + 1),
    source: readFileSync(filePath, "utf8"),
  }));
}
