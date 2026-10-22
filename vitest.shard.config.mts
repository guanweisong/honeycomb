import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config.mts";

// A shard is an incomplete test inventory, so only the required merge job may
// evaluate coverage thresholds. It uses the unchanged base configuration.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    coverage: {
      ...baseConfig.test?.coverage,
      thresholds: undefined,
      reporter: [],
    },
  },
});
