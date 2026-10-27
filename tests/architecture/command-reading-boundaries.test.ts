// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ts from "typescript";

function dependencies(path: string) {
  return ts
    .preProcessFile(readFileSync(path, "utf8"), true, true)
    .importedFiles.map(({ fileName }) => fileName);
}

describe("命令阅读路径", () => {
  it("文章 router 直接进入有实际编排的命令文件", () => {
    expect(dependencies("src/features/post/router.ts")).toContain(
      "@/features/post/server/post-commands",
    );
    expect(existsSync("src/features/post/server/post-use-cases.ts")).toBe(
      false,
    );
  });

  it.each(["post", "user"])(
    "%s 的单用途状态处理不再增加独立文件跳转",
    (feature) => {
      const directory = `src/features/${feature}/server`;
      expect(existsSync(`${directory}/${feature}-command-handlers.ts`)).toBe(
        false,
      );
      expect(dependencies(`${directory}/${feature}-commands.ts`)).not.toContain(
        `./${feature}-command-handlers`,
      );
      expect(dependencies(`${directory}/${feature}-commands.ts`)).not.toContain(
        `@/features/${feature}/server/${feature}-command-handlers`,
      );
    },
  );
});
