import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";
import { processHeavyTests } from "./vitest-test-groups";

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: processHeavyTests,
    exclude: ["node_modules", "dist", ".next", "tests/e2e/**"],
    fileParallelism: false,
    maxWorkers: 1,
  },
});
