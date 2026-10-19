// @vitest-environment node

import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import config from "../vitest.config.mts";
import shardConfig from "../vitest.shard.config.mts";

const coverageMap = z.record(
  z.string(),
  z.object({
    s: z.record(z.string(), z.number()),
    b: z.record(z.string(), z.array(z.number())),
  }),
);

describe("sharded coverage", () => {
  it("changes only report generation and per-shard threshold enforcement", () => {
    expect(shardConfig).toEqual({
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
    expect(config.test?.coverage?.thresholds).toMatchObject({
      statements: 70,
      lines: 70,
      functions: 65,
      branches: 60,
    });
  });

  it("merges actual counters and fails original global and per-file thresholds when coverage is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "honeycomb-shard-coverage-"));
    try {
      symlinkSync(resolve("node_modules"), join(root, "node_modules"), "dir");
      mkdirSync(join(root, "src"));
      writeFileSync(
        join(root, "src/branch.ts"),
        "export function branch(value: boolean) { if (value) return 1; return 0; }\n",
      );
      writeFileSync(
        join(root, "positive.test.ts"),
        "import { it, expect } from 'vitest'; import { branch } from './src/branch'; it('positive', () => expect(branch(true)).toBe(1));\n",
      );
      writeFileSync(
        join(root, "negative.test.ts"),
        "import { it, expect } from 'vitest'; import { branch } from './src/branch'; it('negative', () => expect(branch(false)).toBe(0));\n",
      );
      writeFileSync(
        join(root, "vitest.config.mts"),
        `export default { test: { maxWorkers: 1, coverage: { provider: 'v8', include: ['src/**/*.ts'], reporter: ['json'], thresholds: { statements: 100, branches: 100, functions: 100, lines: 100, 'src/branch.ts': { branches: 100 } } } } };`,
      );
      writeFileSync(
        join(root, "vitest.shard.config.mts"),
        `import config from './vitest.config.mts'; export default { ...config, test: { ...config.test, coverage: { ...config.test.coverage, thresholds: undefined, reporter: [] } } };`,
      );
      const run = (...args: string[]) =>
        spawnSync(
          process.execPath,
          [resolve("node_modules/vitest/vitest.mjs"), ...args],
          { cwd: root, encoding: "utf8", timeout: 30_000 },
        );
      for (const shard of [1, 2]) {
        const result = run(
          "run",
          "--config=vitest.shard.config.mts",
          "--coverage",
          `--shard=${shard}/2`,
          "--reporter=blob",
          `--outputFile=blobs/shard-${shard}.json`,
        );
        expect(result.status, result.stdout + result.stderr).toBe(0);
      }
      const merged = run("run", "--coverage", "--merge-reports=blobs");
      expect(merged.status, merged.stdout + merged.stderr).toBe(0);
      const report = coverageMap.parse(
        JSON.parse(
          readFileSync(join(root, "coverage/coverage-final.json"), "utf8"),
        ),
      );
      const branch = report[join(root, "src/branch.ts")];
      expect(branch).toBeDefined();
      expect(Object.values(branch?.b ?? {}).flat()).toEqual(
        expect.arrayContaining([1]),
      );
      expect(
        Object.values(branch?.b ?? {})
          .flat()
          .every((count) => count > 0),
      ).toBe(true);
      expect(Object.values(branch?.s ?? {})).toContain(2);
      rmSync(join(root, "blobs/shard-2.json"));
      const missing = run("run", "--coverage", "--merge-reports=blobs");
      expect(missing.status).toBe(1);
      expect(missing.stdout + missing.stderr).toContain("global");
      expect(missing.stdout + missing.stderr).toContain("src/branch.ts");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});
