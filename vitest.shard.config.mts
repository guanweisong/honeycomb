import { defineConfig } from "vitest/config";
import config from "./vitest.config.mts";

// A shard sees only part of the tests. The merge job uses the unchanged main
// config to enforce every global and critical-file threshold on combined data.
export default defineConfig({
  ...config,
  test: {
    ...config.test,
    coverage: {
      ...config.test?.coverage,
      thresholds: undefined,
      reporter: [],
    },
  },
});
