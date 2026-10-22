import { join } from "node:path";
import { defineConfig } from "vitest/config";
import shardConfig from "../../../vitest.shard.config.mts";

const output = process.env.HONEYCOMB_COVERAGE_FIXTURE_OUTPUT;
if (!output)
  throw new Error(
    "Coverage fixture requires its own temporary output directory",
  );
const phase = process.env.HONEYCOMB_COVERAGE_FIXTURE_PHASE;

export default defineConfig({
  root: import.meta.dirname,
  test: {
    environment: "node",
    include: ["cases/*.fixture.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    fsModuleCache: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      reportsDirectory: join(output, "coverage"),
      reporter: phase === "shard" ? [] : ["json"],
      // Exercise the real shard config's suppression. Without it, either shard
      // covers only one of three functions and fails the inherited global gate.
      thresholds:
        phase === "shard"
          ? shardConfig.test?.coverage?.thresholds
          : {
              functions: phase === "mutation" ? 100 : 60,
              "src/first.ts": { functions: phase === "mutation" ? 101 : 100 },
            },
    },
  },
});
