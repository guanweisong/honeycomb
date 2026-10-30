import { runTestProcess } from "@tests/helpers/run-test-process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { glob } from "tinyglobby";
import { describe, expect, it } from "vitest";
import type { TestUserConfig } from "vitest/config";

import vitestConfig from "../../vitest.config.mts";
import processConfig from "../../vitest.process.config.mts";

const config = vitestConfig.test as TestUserConfig;
const coverage = config.coverage;

const expectedExclusions = [
  "**/*.d.ts",
  "**/*.test.{ts,tsx}",
  "**/*.spec.{ts,tsx}",
  "src/app/pwa/sw.ts",
  "src/components/ui/**",
  "tests/**",
];

const protectedProductionPatterns = [
  "src/app/**/page.tsx",
  "src/**/hooks/**/*.{ts,tsx}",
  "src/**/*service.ts",
  "src/features/**/server.ts",
  "src/features/**/server/**/*.ts",
  "src/features/**/schemas/**/*.ts",
  "src/features/**/types/**/*.ts",
  "src/features/**/rules/**/*.ts",
  "src/app/admin/**/components/features/**/*.{ts,tsx}",
  "src/app/(blog)/**/components/features/**/*.{ts,tsx}",
  "src/lib/auth/**/*.ts",
  "src/env/**/*.ts",
  "src/lib/observability/**/*.ts",
  "src/app/sitemap*.ts",
  "src/app/lib/server/sitemap-data.ts",
  "src/app/pwa/service-worker-*.ts",
  "src/app/sitemap*/**/*.ts",
  "src/lib/cache/upstash-cache.ts",
];

const criticalCoverageFiles = [
  "src/lib/auth/permissions.ts",
  "src/env/client-schema.ts",
  "src/env/client.ts",
  "src/env/schema.ts",
  "src/env/server.ts",
  "src/env/validation.ts",
  "src/app/lib/server/sitemap-data.ts",
  "src/app/sitemap.xml/route.ts",
  "src/app/sitemaps/[id]/route.ts",
  "src/lib/cache/upstash-cache.ts",
  "src/lib/observability/client.ts",
  "src/lib/observability/adapters/console.ts",
  "src/lib/observability/adapters/console-metrics.ts",
  "src/lib/observability/core/contracts.ts",
  "src/lib/observability/core/metric-label-values.ts",
  "src/lib/observability/core/names.ts",
  "src/lib/observability/core/safe-adapters.ts",
  "src/lib/observability/core/sanitize.ts",
  "src/lib/observability/server/database-operation.ts",
  "src/lib/observability/server/external-service-operation.ts",
  "src/lib/observability/server/index.ts",
  "src/lib/observability/server/registry.ts",
  "src/lib/observability/server/request-context.ts",
];

describe("coverage governance", () => {
  it("preserves explicit mock history ownership across both test lanes", () => {
    expect(config.clearMocks).toBe(false);
    expect(processConfig.test?.clearMocks).toBe(false);
  });

  it("includes every production TypeScript source and only the approved exclusions", () => {
    expect(coverage?.include).toEqual(["src/**/*.{ts,tsx}"]);
    expect(coverage?.exclude).toEqual(expectedExclusions);
  });

  it("discovers both TypeScript and TSX tests", () => {
    expect(config.include).toEqual([
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
      "tests/**/*.spec.{ts,tsx}",
    ]);
  });

  it("keeps feature operations, rules, schemas, UI and security cores in coverage", async () => {
    const requiredFiles = await glob(protectedProductionPatterns, {
      ignore: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/*.d.ts"],
    });
    const coveredFiles = new Set(
      await glob(coverage?.include ?? [], { ignore: coverage?.exclude ?? [] }),
    );

    expect(requiredFiles.length).toBeGreaterThan(0);
    expect(requiredFiles.filter((file) => !coveredFiles.has(file))).toEqual([]);
  });

  it("backs the service-worker exclusion with a real offline navigation E2E", () => {
    const pwaE2e = readFileSync(
      resolve("tests/e2e/blog/pwa-offline.spec.ts"),
      "utf8",
    );

    expect(coverage?.exclude).toContain("src/app/pwa/sw.ts");
    expect(pwaE2e).toContain("navigator.serviceWorker.ready");
    expect(pwaE2e).toContain("context.setOffline(true)");
    expect(pwaE2e).toContain("page.goto(offlineTarget");
    expect(pwaE2e).toMatch(/\.getByRole\s*\(\s*(["'])alert\1\s*\)/);
    expect(pwaE2e).toContain("You're offline");
    expect(pwaE2e).toMatch(/finally\s*{[\s\S]*context\.setOffline\(false\)/);
  });

  it("enforces the approved global thresholds", () => {
    expect(coverage?.thresholds).toMatchObject({
      statements: 70,
      lines: 70,
      functions: 65,
      branches: 60,
    });
  });

  it("runs test files in parallel with a bounded worker count", () => {
    expect(config.fileParallelism).toBe(true);
    expect(config.maxWorkers).toEqual(expect.any(Number));
    expect(config.maxWorkers).toBeGreaterThanOrEqual(1);
    expect(config.maxWorkers).toBeLessThanOrEqual(4);
    expect(config.exclude).toContain(
      "tests/tooling/coverage-governance.test.ts",
    );
    expect(config.exclude).toContain(
      "tests/architecture/server-only-boundaries.test.ts",
    );
  });

  it("keeps type-aware ESLint contracts in the required serial tooling lane", () => {
    const processTests = processConfig.test as TestUserConfig;
    expect(processTests.fileParallelism).toBe(false);
    expect(processTests.maxWorkers).toBe(1);
    for (const path of [
      "tests/tooling/eslint-console-boundaries.test.ts",
      "tests/tooling/type-aware-lint.test.ts",
      "tests/tooling/react-lint-policy.test.ts",
    ]) {
      expect(config.exclude).toContain(path);
      expect(processTests.include).toContain(path);
      expect(processTests.exclude).not.toContain(path);
    }
  });

  it("gives every critical module its own effective 90/80 file threshold", async () => {
    const thresholds = coverage?.thresholds as
      Record<string, unknown> | undefined;

    for (const file of criticalCoverageFiles) {
      expect(await glob(file)).toEqual([file]);
      expect(thresholds?.[file]).toEqual({
        statements: 90,
        lines: 90,
        branches: 80,
      });
    }
  });

  it("fails the real Vitest command when a critical file threshold is mutated", async () => {
    const result = await runTestProcess(
      process.execPath,
      [
        resolve("node_modules/vitest/vitest.mjs"),
        "run",
        "--coverage",
        "--config",
        "tests/fixtures/coverage-threshold-mutation.config.ts",
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        timeout: 45_000,
      },
    );
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toContain(
      'does not meet "src/lib/auth/permissions.ts" threshold (101%)',
    );
  }, 60_000);
});
