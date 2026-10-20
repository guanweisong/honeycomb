// @vitest-environment node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const readRepositoryFile = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");

describe("repository documentation consistency", () => {
  it("keeps project skills discoverable with valid local references", () => {
    const skills = readdirSync(".codex/skills", { withFileTypes: true }).filter(
      (entry) => entry.isDirectory(),
    );
    expect(skills.length).toBeGreaterThan(0);
    const metadata = z.object({
      name: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      description: z.string().min(1),
    });
    for (const skill of skills) {
      const path = resolve(".codex/skills", skill.name, "SKILL.md");
      const source = readFileSync(path, "utf8");
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(frontmatter, path).not.toBeNull();
      const parsed: unknown = parse(frontmatter?.[1] ?? "");
      expect(metadata.parse(parsed).name, path).toBe(skill.name);
      const pending = [path];
      const visited = new Set<string>();
      while (pending.length) {
        const current = pending.pop();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        const text = readFileSync(current, "utf8");
        for (const link of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
          const target = link[1];
          if (!target || /^(?:[a-z]+:|#)/i.test(target)) continue;
          const local = resolve(
            dirname(current),
            target.split("#")[0] ?? target,
          );
          expect(existsSync(local), `${current} -> ${target}`).toBe(true);
          if (local.endsWith(".md")) pending.push(local);
        }
      }
    }
  });

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
      "src/lib/rate-limit/rate-limit.ts",
      "docs/permission-matrix.md",
      "tests/README.md",
    ]) {
      expect(readme).toContain(path);
      expect(() => readRepositoryFile(path)).not.toThrow();
    }

    expect(readme).not.toContain("src/lib/trpc/utils/rate-limit.ts");
    expect(readme).not.toContain("bun test:coverage");
  });

  it("keeps the test documentation aligned with the current coverage command", () => {
    const testReadme = readRepositoryFile("tests/README.md");

    expect(testReadme).toContain("bun run test:unit:coverage");
    expect(testReadme).toContain("不是当前简单架构迁移的验证结果");
    expect(testReadme).toContain("src/components/ui/**");
    expect(testReadme).not.toContain("src/packages/ui/components/**");
    expect(testReadme).not.toContain("42.80%");
    expect(testReadme).not.toContain("43.25%");
    expect(testReadme).not.toContain("Other Routers");
  });

  it("describes the installed Sentry integration rather than a future SDK", () => {
    const readme = readRepositoryFile("README.md");
    const packageJson = JSON.parse(readRepositoryFile("package.json")) as {
      dependencies: Record<string, string>;
    };
    expect(packageJson.dependencies["@sentry/nextjs"]).toBeTypeOf("string");
    expect(readme).toContain("当前已接入 `@sentry/nextjs`");
    expect(readme).toContain("Sentry Logs");
    expect(readme).toContain("docs/sentry-logging.md");
    expect(readme).not.toContain("本项目当前不引入 OpenTelemetry、Sentry");
  });

  it("documents current account-security ownership and cross-feature tests", () => {
    const spec = readRepositoryFile(
      "openspec/specs/account-security-trpc-api/spec.md",
    );
    expect(spec).toContain("features/user/account-security");
    expect(spec).toContain("app/_auth");
    expect(spec).not.toContain("放在独立的账号安全领域包中");
    const testReadme = readRepositoryFile("tests/README.md");
    expect(testReadme).toContain("跨 feature 回归");
    expect(testReadme).not.toContain("只有跨模块的通用测试工具和配置才放在");
  });
});
