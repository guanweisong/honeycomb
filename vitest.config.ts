import { defineConfig } from "vitest/config";
import { resolve } from "path";

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
] as const;

const criticalCoverageThresholds = Object.fromEntries(
  criticalCoverageFiles.map((file) => [
    file,
    { statements: 90, lines: 90, branches: 80 },
  ]),
);

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    // 覆盖率治理测试会同步启动 Vitest 子进程；关闭文件级并行，避免重型测试争用进程和端口资源。
    fileParallelism: false,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
      "tests/**/*.spec.{ts,tsx}",
    ],
    exclude: ["node_modules", "dist", ".next", "tests/e2e/**"],
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
        "src/packages/ui/components/**",
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
      "@": resolve(__dirname, "./src"),
      "@tests": resolve(__dirname, "./tests"),
      "server-only": resolve(__dirname, "./tests/setup/server-only.ts"),
    },
  },
});
