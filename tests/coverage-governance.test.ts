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
  "src/packages/auth/**/*.ts",
  "src/env/**/*.ts",
  "src/packages/observability/**/*.ts",
  "src/app/sitemap*.ts",
  "src/app/sitemap*/**/*.ts",
  "src/packages/trpc/api/utils/upstash-cache.ts",
];

const criticalCoverageFiles = [
  "src/packages/auth/permissions.ts",
  "src/env/client-schema.ts",
  "src/env/client.ts",
  "src/env/schema.ts",
  "src/env/server.ts",
  "src/env/validation.ts",
  "src/app/sitemap-data.ts",
  "src/app/sitemap.xml/route.ts",
  "src/app/sitemaps/[id]/route.ts",
  "src/packages/trpc/api/utils/upstash-cache.ts",
  "src/packages/observability/client.ts",
  "src/packages/observability/adapters/console.ts",
  "src/packages/observability/adapters/memory.ts",
  "src/packages/observability/adapters/noop.ts",
  "src/packages/observability/core/contracts.ts",
  "src/packages/observability/core/metric-label-values.ts",
  "src/packages/observability/core/names.ts",
  "src/packages/observability/core/safe-adapters.ts",
  "src/packages/observability/core/sanitize.ts",
  "src/packages/observability/server/database-operation.ts",
  "src/packages/observability/server/external-service-operation.ts",
  "src/packages/observability/server/index.ts",
  "src/packages/observability/server/node-request-context.ts",
  "src/packages/observability/server/registry.ts",
  "src/packages/observability/server/request-context.ts",
];

describe("coverage governance", () => {
  it("includes every production TypeScript source and only the approved exclusions", () => {
    expect(coverage?.include).toEqual(["src/**/*.{ts,tsx}"]);
    expect(coverage?.exclude).toEqual(expectedExclusions);
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

  it("enforces the approved global thresholds", () => {
    expect(coverage?.thresholds).toMatchObject({
      statements: 70,
      lines: 70,
      functions: 65,
      branches: 60,
    });
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
});
