import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { glob } from "tinyglobby";
import { describe, expect, it } from "vitest";
import type { TestUserConfig } from "vitest/config";

import vitestConfig from "../vitest.config";

const config = vitestConfig.test as TestUserConfig;
const coverage = config.coverage;

const expectedExclusions = [
  "**/*.d.ts",
  "**/*.test.{ts,tsx}",
  "**/*.spec.{ts,tsx}",
  "src/app/sw.ts",
  "src/packages/ui/components/**",
  "tests/**",
];

const protectedProductionPatterns = [
  "src/app/**/page.tsx",
  "src/**/hooks/**/*.{ts,tsx}",
  "src/**/*service.ts",
  "src/packages/identity/auth/**/*.ts",
  "src/env/**/*.ts",
  "src/packages/infrastructure/observability/**/*.ts",
  "src/app/sitemap*.ts",
  "src/app/sitemap*/**/*.ts",
  "src/packages/infrastructure/cache/upstash-cache.ts",
];

const criticalCoverageFiles = [
  "src/packages/identity/auth/permissions.ts",
  "src/env/client-schema.ts",
  "src/env/client.ts",
  "src/env/schema.ts",
  "src/env/server.ts",
  "src/env/validation.ts",
  "src/app/sitemap-data.ts",
  "src/app/sitemap.xml/route.ts",
  "src/app/sitemaps/[id]/route.ts",
  "src/packages/infrastructure/cache/upstash-cache.ts",
  "src/packages/infrastructure/observability/client.ts",
  "src/packages/infrastructure/observability/adapters/console.ts",
  "src/packages/infrastructure/observability/adapters/memory.ts",
  "src/packages/infrastructure/observability/adapters/noop.ts",
  "src/packages/infrastructure/observability/core/contracts.ts",
  "src/packages/infrastructure/observability/core/metric-label-values.ts",
  "src/packages/infrastructure/observability/core/names.ts",
  "src/packages/infrastructure/observability/core/safe-adapters.ts",
  "src/packages/infrastructure/observability/core/sanitize.ts",
  "src/packages/infrastructure/observability/server/database-operation.ts",
  "src/packages/infrastructure/observability/server/external-service-operation.ts",
  "src/packages/infrastructure/observability/server/index.ts",
  "src/packages/infrastructure/observability/server/node-request-context.ts",
  "src/packages/infrastructure/observability/server/registry.ts",
  "src/packages/infrastructure/observability/server/request-context.ts",
];

describe("coverage governance", () => {
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

  it("keeps business pages, hooks, services, and security cores in coverage", async () => {
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

    expect(coverage?.exclude).toContain("src/app/sw.ts");
    expect(pwaE2e).toContain("navigator.serviceWorker.ready");
    expect(pwaE2e).toContain("context.setOffline(true)");
    expect(pwaE2e).toContain("page.goto(offlineTarget");
    expect(pwaE2e).toContain("getByRole('alert')");
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
    expect(config.maxWorkers).toBe(4);
    expect(config.exclude).toContain("tests/coverage-governance.test.ts");
    expect(config.exclude).toContain("tests/server-only-boundaries.test.ts");
  });

  it("gives every critical module its own effective 90/80 file threshold", async () => {
    const thresholds = coverage?.thresholds as
      | Record<string, unknown>
      | undefined;

    for (const file of criticalCoverageFiles) {
      expect(await glob(file)).toEqual([file]);
      expect(thresholds?.[file]).toEqual({
        statements: 90,
        lines: 90,
        branches: 80,
      });
    }
  });

  it("fails the real Vitest command when a critical file threshold is mutated", () => {
    const result = spawnSync(
      process.execPath,
      [
        resolve("node_modules/vitest/vitest.mjs"),
        "run",
        "--coverage",
        "--config",
        "tests/fixtures/coverage-threshold-mutation.config.ts",
      ],
      { cwd: process.cwd(), encoding: "utf8", env: process.env },
    );
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toContain(
      'does not meet "src/packages/identity/auth/permissions.ts" threshold (101%)',
    );
  }, 60_000);
});
