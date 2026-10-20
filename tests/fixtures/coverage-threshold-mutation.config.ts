import { defineConfig } from "vitest/config";
import type { TestUserConfig } from "vitest/config";

import projectConfig from "../../vitest.config.mts";

const criticalFile = "src/lib/auth/permissions.ts";
const projectTestConfig = projectConfig.test as TestUserConfig;

export default defineConfig({
  ...projectConfig,
  test: {
    ...projectTestConfig,
    include: ["src/lib/auth/permissions.test.ts"],
    coverage: {
      ...projectTestConfig.coverage,
      reporter: ["text-summary"],
      reportsDirectory: "coverage/threshold-mutation",
      include: [criticalFile],
      thresholds: {
        statements: 0,
        lines: 0,
        functions: 0,
        branches: 0,
        [criticalFile]: { statements: 101 },
      },
    },
  },
});
