import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const readRepositoryFile = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");

describe("repository documentation consistency", () => {
  it("documents only package scripts that exist", () => {
    const packageJson = JSON.parse(readRepositoryFile("package.json")) as {
      scripts: Record<string, string>;
    };
    const readme = readRepositoryFile("README.md");
    const documentedScripts = [
      "dev",
      "build",
      "start",
      "lint",
      "lint:fix",
      "format",
      "check-types",
      "test",
      "test:unit",
      "test:unit:run",
      "test:unit:coverage",
      "test:e2e",
      "test:e2e:ui",
      "test:e2e:smoke",
      "test:e2e:regression",
    ];

    for (const script of documentedScripts) {
      expect(packageJson.scripts[script], script).toBeTypeOf("string");
      expect(readme).toContain(`bun run ${script}`);
    }
  });

  it("keeps documented repository paths real", () => {
    const readme = readRepositoryFile("README.md");

    for (const path of [
      "src/packages/infrastructure/rate-limit/rate-limit.ts",
      "docs/permission-matrix.md",
      "tests/README.md",
    ]) {
      expect(readme).toContain(path);
      expect(() => readRepositoryFile(path)).not.toThrow();
    }

    expect(readme).not.toContain("src/packages/trpc/api/utils/rate-limit.ts");
    expect(readme).not.toContain("bun test:coverage");
  });

  it("keeps the test documentation aligned with the current coverage command", () => {
    const testReadme = readRepositoryFile("tests/README.md");

    expect(testReadme).toContain("bun run test:unit:coverage");
    expect(testReadme).toContain("210 个测试文件通过");
    expect(testReadme).not.toContain("42.80%");
    expect(testReadme).not.toContain("43.25%");
    expect(testReadme).not.toContain("Other Routers");
  });
});
