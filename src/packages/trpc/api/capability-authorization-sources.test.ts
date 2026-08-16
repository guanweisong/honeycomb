import { describe, expect, it } from "vitest";
import { loadProductionSources } from "./capability-authorization-sources";

describe("授权源码加载器", () => {
  it("只加载非测试 TypeScript 源码并排除授权测试工具自身", () => {
    const files = loadProductionSources().map(({ fileName }) => fileName);

    expect(files.some((file) => /\.test\.(ts|tsx)$/.test(file))).toBe(false);
    expect(files).not.toContain(
      "src/packages/trpc/api/capability-authorization-static.ts",
    );
    expect(files).not.toContain(
      "src/packages/trpc/api/capability-authorization-sources.ts",
    );
  });
});
