import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { processHeavyTests } from "./vitest-test-groups.mts";

const criticalCoverageFiles = [
  "src/lib/auth/permissions.ts",
  "src/env/client-schema.ts",
  "src/env/client.ts",
  "src/env/schema.ts",
  "src/env/server.ts",
  "src/env/validation.ts",
  "src/app/sitemap-data.ts",
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
  "src/lib/observability/server/node-request-context.ts",
  "src/lib/observability/server/registry.ts",
  "src/lib/observability/server/request-context.ts",
] as const;

const criticalCoverageThresholds = Object.fromEntries(
  criticalCoverageFiles.map((file) => [
    file,
    { statements: 90, lines: 90, branches: 80 },
  ]),
);

const unitTestInclude = [
  "src/**/*.test.{ts,tsx}",
  "src/**/*.spec.{ts,tsx}",
  "tests/**/*.test.{ts,tsx}",
  "tests/**/*.spec.{ts,tsx}",
];

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: unitTestInclude,
    exclude: [
      "node_modules",
      "dist",
      ".next",
      "tests/e2e/**",
      ...processHeavyTests,
    ],
    // 普通测试文件并行执行；进程型边界测试通过较低 worker 上限避免资源竞争。
    fileParallelism: true,
    maxWorkers: process.env.CI ? 2 : 4,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // TypeScript declarations contain contracts but no executable behavior.
        "**/*.d.ts",
        // Tests are evidence, not production code in the coverage denominator.
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        // This thin service-worker entry is exercised only by the real offline E2E.
        "src/app/sw.ts",
        // These files are unmodified shadcn primitives; extended/business UI stays covered.
        "src/components/ui/**",
        // Cross-module tests and fixtures are never production sources.
        "tests/**",
      ],
      thresholds: {
        statements: 70,
        lines: 70,
        functions: 65,
        branches: 60,
        // Vitest 4.1 applies top-level `perFile` to global thresholds too.
        // Exact single-file patterns provide critical per-file gates without
        // incorrectly imposing the global aggregate thresholds on every file.
        ...criticalCoverageThresholds,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      "@tests": resolve(import.meta.dirname, "./tests"),
      "server-only": resolve(
        import.meta.dirname,
        "./tests/setup/server-only.ts",
      ),
    },
  },
});
