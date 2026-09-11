import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";
import { z } from "zod";

import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/quality.yml"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as { packageManager: string; scripts: Record<string, string> };

describe("quality workflow", () => {
  it("uses the repository Bun version and lockfile installation", () => {
    expect(packageJson.packageManager).toBe("bun@1.4.2");
    expect(workflow).toContain("bun-version: 1.4.2");
    expect(workflow).toContain("bun install --frozen-lockfile");
  });

  it("keeps Turbopack analysis finite and writes static diagnostics", () => {
    expect(workflow).toContain("- run: bun run build");
    expect(workflow).toContain("- run: timeout 10m bun run analyze");
    expect(workflow).toContain("path: .next/diagnostics/analyze/");
    expect(packageJson.scripts.analyze).toBe(
      "bun next experimental-analyze --output",
    );
    expect(workflow).not.toMatch(/webpack/i);
  });

  it("keeps all blocking quality and security checks", () => {
    for (const command of [
      "bun run check-types",
      "bun run lint",
      "bun run test:unit:run",
      "bun run test:unit:coverage",
      "bun run test:unit:process",
      "bun run audit:production",
      "bun run db:e2e:seed",
      "bun run test:e2e:development",
      "bun run test:e2e:production",
    ]) {
      expect(workflow).toContain(command);
    }
    expect(workflow).not.toContain("bun audit --audit-level=critical");
    expect(workflow).not.toMatch(/playwright test\s+tests\/e2e\//);
  });

  it("CI selections are disjoint and together execute the complete Playwright inventory", () => {
    const ci = z
      .object({
        jobs: z.object({
          verify: z.object({
            steps: z.array(
              z.object({
                run: z.string().optional(),
                env: z.record(z.string(), z.string()).optional(),
              }),
            ),
          }),
        }),
      })
      .parse(parse(workflow));
    const suite = z.object({
      suites: z.array(z.unknown()).default([]),
      specs: z
        .array(
          z.object({
            id: z.string(),
            tests: z.array(z.object({ projectId: z.string() })),
          }),
        )
        .default([]),
    });
    const collect = (value: unknown): string[] => {
      const current = suite.parse(value);
      return [
        ...current.specs.flatMap((spec) =>
          spec.tests.map((test) => `${spec.id}:${test.projectId}`),
        ),
        ...current.suites.flatMap(collect),
      ];
    };
    const inventory = (script: string, env: Record<string, string> = {}) => {
      expect(packageJson.scripts[script]).toBeDefined();
      const result = spawnSync(
        "bun",
        ["run", script, "--list", "--reporter=json"],
        {
          cwd: process.cwd(),
          env: { ...process.env, ...env },
          encoding: "utf8",
          timeout: 30_000,
        },
      );
      expect(result.status, result.stdout + result.stderr).toBe(0);
      return collect(JSON.parse(result.stdout));
    };
    const devStep = ci.jobs.verify.steps.find(
      (step) => step.run === "bun run test:e2e:development",
    );
    const productionStep = ci.jobs.verify.steps.find(
      (step) => step.run === "bun run test:e2e:production",
    );
    expect(devStep?.env?.PLAYWRIGHT_USE_DEV_SERVER).toBe("1");
    expect(productionStep?.env?.PLAYWRIGHT_USE_DEV_SERVER).toBe("0");
    for (const key of [
      "PLAYWRIGHT_PORT",
      "PLAYWRIGHT_OUTPUT_DIR",
      "PLAYWRIGHT_HTML_REPORT",
    ]) {
      expect(devStep?.env?.[key]).toBeTruthy();
      expect(productionStep?.env?.[key]).toBeTruthy();
      expect(devStep?.env?.[key]).not.toBe(productionStep?.env?.[key]);
    }
    expect(devStep?.env?.PLAYWRIGHT_REUSE_EXISTING_SERVER).not.toBe("1");
    expect(productionStep?.env?.PLAYWRIGHT_REUSE_EXISTING_SERVER).not.toBe("1");
    const full = inventory("test:e2e");
    const dev = inventory("test:e2e:development", devStep?.env);
    const production = inventory("test:e2e:production", productionStep?.env);
    expect(dev.length).toBeGreaterThan(0);
    expect(production.length).toBeGreaterThan(0);
    expect(dev.filter((id) => production.includes(id))).toEqual([]);
    expect([...dev, ...production].sort()).toEqual(full.sort());
  }, 60_000);

  it("does not conditionally skip deterministic E2E inventory", () => {
    const e2eRoot = resolve(process.cwd(), "tests/e2e");
    const conditionalSkips = readdirSync(e2eRoot, { recursive: true })
      .filter(
        (path): path is string =>
          typeof path === "string" && path.endsWith(".spec.ts"),
      )
      .flatMap((path) => {
        const source = readFileSync(resolve(e2eRoot, path), "utf8");
        return /\btest\s*\.\s*(?:describe\s*\.\s*)?skip\s*\(/.test(source)
          ? [path]
          : [];
      });

    expect(conditionalSkips).toEqual([]);
  });
});
