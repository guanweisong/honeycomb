// @vitest-environment node

import { runTestProcess } from "@tests/helpers/run-test-process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import baseConfig from "../../vitest.config.mts";
import shardConfig from "../../vitest.shard.config.mts";

const fixture = resolve("tests/fixtures/coverage-sharding");

describe("coverage sharding", () => {
  it("defers only thresholds and reports, never the production denominator", () => {
    expect(shardConfig.test?.coverage?.thresholds).toBeUndefined();
    expect(shardConfig.test?.coverage?.reporter).toEqual([]);
    expect(shardConfig.test?.coverage?.include).toEqual(
      baseConfig.test?.coverage?.include,
    );
    expect(shardConfig.test?.coverage?.exclude).toEqual(
      baseConfig.test?.coverage?.exclude,
    );
    expect(shardConfig.test?.include).toEqual(baseConfig.test?.include);
    expect(shardConfig.test?.exclude).toEqual(baseConfig.test?.exclude);
    expect(baseConfig.test?.coverage?.thresholds).toMatchObject({
      statements: 70,
      lines: 70,
      functions: 65,
      branches: 60,
    });
  });

  it("merges real shards, retains untested sources, and fails stricter gates", async () => {
    const output = mkdtempSync(join(tmpdir(), "honeycomb-coverage-shards-"));
    const blobs = join(output, "blobs");
    const run = (phase: "shard" | "merge" | "mutation", args: string[]) =>
      runTestProcess(
        process.execPath,
        [
          resolve("node_modules/vitest/vitest.mjs"),
          "run",
          "--config",
          join(fixture, "vitest.config.mts"),
          "--coverage.enabled",
          ...args,
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            HONEYCOMB_COVERAGE_FIXTURE_OUTPUT: output,
            HONEYCOMB_COVERAGE_FIXTURE_PHASE: phase,
          },
          timeout: 15_000,
        },
      );

    try {
      for (const index of [1, 2]) {
        const result = await run("shard", [
          `--shard=${index}/2`,
          "--reporter=blob",
          `--outputFile.blob=${join(blobs, `blob-${index}-2.json`)}`,
        ]);
        expect(result.status, result.stdout + result.stderr).toBe(0);
      }
      expect(readdirSync(blobs).sort()).toEqual([
        "blob-1-2.json",
        "blob-2-2.json",
      ]);

      const merged = await run("merge", [`--merge-reports=${blobs}`]);
      expect(merged.status, merged.stdout + merged.stderr).toBe(0);
      const report = JSON.parse(
        readFileSync(join(output, "coverage/coverage-final.json"), "utf8"),
      ) as Record<string, { f: Record<string, number> }>;
      expect(Object.keys(report).sort()).toEqual(
        ["first.ts", "second.ts", "untested.ts"]
          .map((file) => join(fixture, "src", file))
          .sort(),
      );
      expect(Object.values(report[join(fixture, "src/first.ts")]!.f)).toEqual([
        1,
      ]);
      expect(Object.values(report[join(fixture, "src/second.ts")]!.f)).toEqual([
        1,
      ]);
      expect(
        Object.values(report[join(fixture, "src/untested.ts")]!.f),
      ).toEqual([0]);

      // Reuse the exact same blobs: only the aggregate and critical-file gates
      // change, so a failure cannot be attributed to a failing fixture test.
      const mutation = await run("mutation", [`--merge-reports=${blobs}`]);
      expect(mutation.status, mutation.stdout + mutation.stderr).toBe(1);
      expect(mutation.stdout + mutation.stderr).toContain(
        "does not meet global threshold (100%)",
      );
      expect(mutation.stdout + mutation.stderr).toContain(
        'does not meet "src/first.ts" threshold (101%)',
      );
    } finally {
      rmSync(output, { recursive: true, force: true });
      expect(existsSync(output)).toBe(false);
    }
  }, 45_000);

  it.each<{
    files: string[];
    accepted: boolean;
    emptyFile?: string;
    directory?: string;
  }>([
    { files: ["blob-1-2.json", "blob-2-2.json"], accepted: true },
    { files: ["blob-1-2.json"], accepted: false },
    { files: ["blob-2-2.json"], accepted: false },
    {
      files: ["blob-1-2.json", "blob-2-2.json", "stale.json"],
      accepted: false,
    },
    {
      files: ["blob-1-2.json", "blob-2-2.json"],
      emptyFile: "blob-1-2.json",
      accepted: false,
    },
    {
      files: ["blob-1-2.json", "blob-2-2.json"],
      emptyFile: "blob-2-2.json",
      accepted: false,
    },
    {
      files: ["blob-1-2.json", "blob-2-2.json"],
      directory: "unexpected-directory",
      accepted: false,
    },
  ])(
    "checks workflow blobs: $files, empty: $emptyFile, directory: $directory",
    async ({ files, accepted, emptyFile, directory }) => {
      const workflow = parse(
        readFileSync(resolve(".github/workflows/quality.yml"), "utf8"),
      ) as { jobs: Record<string, { steps: { run?: string }[] }> };
      const command = workflow.jobs.coverage_gate?.steps.find((step) =>
        step.run?.includes("--merge-reports="),
      )?.run;
      expect(command).toBeDefined();
      // Execute the real shell guards without starting Vitest or installing Bun.
      const finalCommand =
        /^\s*bun run test:unit:coverage --merge-reports=\S+\s*$/m;
      expect(command).toMatch(finalCommand);
      const guardedCommand = command!.replace(
        finalCommand,
        "printf MERGE_REACHED",
      );
      const output = mkdtempSync(
        join(tmpdir(), "honeycomb-coverage-inventory-"),
      );
      try {
        const blobs = join(output, ".vitest/blob");
        mkdirSync(blobs, { recursive: true });
        for (const file of files) writeFileSync(join(blobs, file), "fixture");
        if (emptyFile) writeFileSync(join(blobs, emptyFile), "");
        if (directory) mkdirSync(join(blobs, directory));
        const result = await runTestProcess(
          "bash",
          ["-e", "-o", "pipefail", "-c", guardedCommand],
          {
            cwd: output,
            env: process.env,
            timeout: 5_000,
          },
        );
        expect(result.status === 0, result.stdout + result.stderr).toBe(
          accepted,
        );
        expect(result.stdout.includes("MERGE_REACHED")).toBe(accepted);
      } finally {
        rmSync(output, { recursive: true, force: true });
        expect(existsSync(output)).toBe(false);
      }
    },
  );
});
