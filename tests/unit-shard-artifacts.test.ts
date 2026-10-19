// @vitest-environment node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { JsonAssertionResult, JsonTestResult } from "vitest/reporters";
import { globSync } from "tinyglobby";
import { runChecks, validateCoverageFiles } from "../scripts/check-unit-shards";
import vitestConfig from "../vitest.config.mts";

const projectRoot = process.cwd();
type AssertionFixture = Omit<JsonAssertionResult, "meta" | "tags">;
type FileFixture = Omit<JsonTestResult, "assertionResults"> & {
  assertionResults: AssertionFixture[];
};

function assertion(
  title: string,
  ancestorTitles = ["suite"],
): AssertionFixture {
  return {
    ancestorTitles,
    title,
    fullName: [...ancestorTitles, title].join(" "),
    status: "passed",
    failureMessages: [],
  };
}

function testFile(name: string, assertions: AssertionFixture[]): FileFixture {
  return {
    name: join(projectRoot, name),
    status: "passed",
    message: "",
    startTime: 1,
    endTime: 2,
    assertionResults: assertions,
  };
}

function report(testResults: FileFixture[]) {
  const count = testResults.reduce(
    (total, file) => total + file.assertionResults.length,
    0,
  );
  return {
    success: true,
    startTime: 1,
    numTotalTestSuites: testResults.length * 2,
    numPassedTestSuites: testResults.length * 2,
    numFailedTestSuites: 0,
    numPendingTestSuites: 0,
    numTotalTests: count,
    numPassedTests: count,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults,
  };
}

describe("unit shard artifact integrity", () => {
  let directory: string;
  let artifacts: string;
  let inventory: string;
  let output: string;
  let first: FileFixture;
  let second: FileFixture;

  const writeJson = (path: string, value: unknown) =>
    writeFileSync(path, JSON.stringify(value));
  const runCli = (...args: string[]) =>
    spawnSync("bun", ["scripts/check-unit-shards.ts", ...args], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 10_000,
    });
  const run = (...args: string[]) => runChecks(args, projectRoot);
  const check = () => run(artifacts, inventory, output);
  const writeShard = (shard: number, value: unknown) =>
    writeJson(join(artifacts, `unit-shard-${shard}`, "results.json"), value);
  const expectRejected = (message: RegExp) => {
    expect(check).toThrow(message);
    expect(existsSync(output)).toBe(false);
  };

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-unit-shards-"));
    artifacts = join(directory, "artifacts");
    inventory = join(directory, "inventory.json");
    output = join(directory, "validated-blobs");
    first = testFile("tests/alpha.test.ts", [
      assertion("same case"),
      assertion("same case"),
    ]);
    second = testFile("src/beta.test.ts", [
      assertion("nested case", ["outer", "inner"]),
    ]);
    for (const shard of [1, 2]) {
      mkdirSync(join(artifacts, `unit-shard-${shard}`), { recursive: true });
      // Blob internals belong to Vitest's native merge, not this inventory guard.
      writeFileSync(
        join(artifacts, `unit-shard-${shard}`, "blob.json"),
        `opaque blob ${shard}`,
      );
    }
    writeShard(1, report([first]));
    writeShard(2, report([second]));
    // Independent expected list, including duplicate parameterized test titles.
    writeJson(inventory, [
      {
        name: "suite > same case",
        file: join(projectRoot, "tests/alpha.test.ts"),
      },
      {
        name: "suite > same case",
        file: join(projectRoot, "tests/alpha.test.ts"),
      },
      {
        name: "outer > inner > nested case",
        file: join(projectRoot, "src/beta.test.ts"),
      },
    ]);
  });

  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it("copies exactly two distinct blobs only after complete inventory validation", () => {
    const result = runCli(artifacts, inventory, output);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readdirSync(output).sort()).toEqual([
      "shard-1.json",
      "shard-2.json",
    ]);
    expect(readFileSync(join(output, "shard-1.json"), "utf8")).toBe(
      "opaque blob 1",
    );
    expect(readFileSync(join(output, "shard-2.json"), "utf8")).toBe(
      "opaque blob 2",
    );
  });

  it("accepts an existing empty output directory", () => {
    mkdirSync(output);
    expect(check).not.toThrow();
  });

  it("normalizes in-root paths without losing their directories", () => {
    first.name = `${projectRoot}/tests/../tests/alpha.test.ts`;
    writeShard(1, report([first]));
    expect(check).not.toThrow();
  });

  it("does not overwrite an existing nonempty merge directory", () => {
    mkdirSync(output);
    writeFileSync(join(output, "stale.json"), "keep");
    expect(check).toThrow();
    expect(readdirSync(output)).toEqual(["stale.json"]);
    expect(readFileSync(join(output, "stale.json"), "utf8")).toBe("keep");
  });

  it.each(["unit-shard-1", "unit-shard-2"])(
    "rejects missing artifact %s",
    (name) => {
      rmSync(join(artifacts, name), { recursive: true });
      expectRejected(/artifact|shard/i);
    },
  );

  it.each(["unit-shard-3", "unit-shard-1-copy"])(
    "rejects extra artifact %s",
    (name) => {
      mkdirSync(join(artifacts, name));
      expectRejected(/artifact|shard/i);
    },
  );

  it.each(["blob.json", "results.json"])(
    "rejects missing required file %s",
    (name) => {
      rmSync(join(artifacts, "unit-shard-2", name));
      expectRejected(/artifact|file/i);
    },
  );

  it("rejects a wrong filename rather than guessing which blob to use", () => {
    renameSync(
      join(artifacts, "unit-shard-2", "blob.json"),
      join(artifacts, "unit-shard-2", "other.json"),
    );
    expectRejected(/artifact|file/i);
  });

  it("rejects extra nested contents", () => {
    mkdirSync(join(artifacts, "unit-shard-1", "nested"));
    expectRejected(/artifact|file/i);
  });

  it.each(["", " \n\t"])("rejects empty blob contents %j", (blob) => {
    writeFileSync(join(artifacts, "unit-shard-2", "blob.json"), blob);
    expectRejected(/empty|blob/i);
  });

  it.each(["blob.json", "results.json"])(
    "rejects symlinked artifact file %s",
    (name) => {
      const path = join(artifacts, "unit-shard-2", name);
      const target = join(directory, name);
      renameSync(path, target);
      symlinkSync(target, path);
      expectRejected(/symlink|regular/i);
    },
  );

  it.each(["root", "shard"])(
    "rejects a symlinked artifact %s directory",
    (kind) => {
      const path =
        kind === "root" ? artifacts : join(artifacts, "unit-shard-2");
      const target = join(directory, "real-directory");
      renameSync(path, target);
      symlinkSync(target, path);
      expectRejected(/symlink|directory/i);
    },
  );

  it("rejects a symlinked merge output", () => {
    const target = join(directory, "real-output");
    mkdirSync(target);
    symlinkSync(target, output);
    expect(check).toThrow();
    expect(readdirSync(target)).toEqual([]);
  });

  it("rejects malformed reporter JSON", () => {
    writeFileSync(join(artifacts, "unit-shard-2", "results.json"), "{");
    expectRejected(/JSON/i);
  });

  it.each([null, {}, { success: true, testResults: [] }])(
    "rejects incomplete reporter data %j",
    (value) => {
      writeShard(2, value);
      expectRejected(/report|invalid/i);
    },
  );

  it("rejects a duplicated file within one shard", () => {
    writeShard(1, report([first, first]));
    expectRejected(/duplicate|overlap/i);
  });

  it("rejects overlapping files between shards", () => {
    writeShard(2, report([first, second]));
    expectRejected(/duplicate|overlap/i);
  });

  it("rejects an omitted file", () => {
    writeShard(2, report([]));
    expectRejected(/empty|missing|inventory|report/i);
  });

  it("preserves repeated case names as a multiset and rejects one missing occurrence", () => {
    first.assertionResults.pop();
    writeShard(1, report([first]));
    expectRejected(/case|inventory/i);
  });

  it("rejects an extra duplicate occurrence", () => {
    first.assertionResults.push(assertion("same case"));
    writeShard(1, report([first]));
    expectRejected(/case|inventory/i);
  });

  it("rejects an unexpected case even when totals match", () => {
    second.assertionResults = [assertion("unexpected", ["outer", "inner"])];
    writeShard(2, report([second]));
    expectRejected(/case|inventory/i);
  });

  it("compares full nested titles rather than leaf titles", () => {
    second.assertionResults = [
      assertion("nested case", ["different", "inner"]),
    ];
    writeShard(2, report([second]));
    expectRejected(/case|inventory/i);
  });

  it("does not conflate equal basenames in different directories", () => {
    second.name = join(projectRoot, "tests/beta.test.ts");
    writeShard(2, report([second]));
    expectRejected(/file|inventory/i);
  });

  it.each(["/outside/repository.test.ts", "../escape.test.ts"])(
    "rejects paths outside the repository: %s",
    (name) => {
      second.name = name;
      writeShard(2, report([second]));
      expectRejected(/path|root|absolute/i);
    },
  );

  it.each(["failed", "skipped", "pending", "todo", "disabled"] as const)(
    "rejects %s cases regardless of claimed totals",
    (status) => {
      second.assertionResults = [
        { ...assertion("nested case", ["outer", "inner"]), status },
      ];
      writeShard(2, report([second]));
      expectRejected(/passed|report|status/i);
    },
  );

  it("rejects a failed file regardless of passing assertions", () => {
    second.status = "failed";
    writeShard(2, report([second]));
    expectRejected(/passed|report|status/i);
  });

  it.each([
    { success: false },
    { numFailedTests: 1 },
    { numPendingTests: 1 },
    { numTodoTests: 1 },
    { numFailedTestSuites: 1 },
    { numPendingTestSuites: 1 },
    { numTotalTests: 2 },
    { numPassedTests: 0 },
    { numPassedTestSuites: 0 },
    { numTotalTestSuites: 0 },
  ])("rejects unsuccessful or inconsistent summary %j", (change) => {
    writeShard(2, { ...report([second]), ...change });
    expectRejected(/passed|report|count|success/i);
  });

  it("rejects invalid assertion title structures", () => {
    writeShard(2, report([{ ...second, assertionResults: [] }]));
    expectRejected(/empty|case|report|inventory/i);
  });

  it.each([
    { ancestorTitles: null },
    { ancestorTitles: [1] },
    { title: 1 },
    { failureMessages: ["failed hook"] },
  ])("rejects malformed or contradictory assertions %j", (change) => {
    writeShard(2, {
      ...report([second]),
      testResults: [
        {
          ...second,
          assertionResults: [
            { ...assertion("nested case", ["outer", "inner"]), ...change },
          ],
        },
      ],
    });
    expectRejected(/report|passed/i);
  });

  it.each([null, {}, [], [{ name: "case", file: 3 }]])(
    "rejects malformed or empty inventory %j",
    (value) => {
      writeJson(inventory, value);
      expectRejected(/inventory|invalid/i);
    },
  );

  it("validates the native merged report against the full case inventory", () => {
    const merged = join(directory, "merged.json");
    writeJson(merged, report([first, second]));
    const coverage = vitestConfig.test?.coverage;
    const files = globSync(coverage?.include ?? [], {
      cwd: projectRoot,
      absolute: true,
      ignore: coverage?.exclude,
    });
    writeJson(
      join(directory, "coverage-final.json"),
      Object.fromEntries(files.map((file) => [file, {}])),
    );
    expect(() => run("--merged", merged, inventory)).not.toThrow();
    expect(existsSync(output)).toBe(false);
  });

  it("rejects a native merge missing a file because one blob replaced the other", () => {
    const merged = join(directory, "merged.json");
    writeJson(merged, report([first]));
    expect(() => run("--merged", merged, inventory)).toThrow(/file|inventory/i);
  });

  it("rejects duplicated files in a native merged report", () => {
    const merged = join(directory, "merged.json");
    writeJson(merged, report([first, second, first]));
    expect(() => run("--merged", merged, inventory)).toThrow(/duplicate/i);
  });

  it("rejects a merged report without its native coverage output", () => {
    const merged = join(directory, "merged.json");
    writeJson(merged, report([first, second]));
    expect(() => run("--merged", merged, inventory)).toThrow(
      /coverage-final\.json/,
    );
  });

  it("rejects merged coverage that omits untested source files", () => {
    const merged = join(directory, "merged.json");
    writeJson(merged, report([first, second]));
    writeJson(join(directory, "coverage-final.json"), {});
    expect(() => run("--merged", merged, inventory)).toThrow(
      /coverage.*inventory/i,
    );
  });

  it("fails with usage help when CLI arguments are missing", () => {
    const result = runCli(artifacts, inventory);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/usage/i);
  });
});

describe("native coverage file inventory", () => {
  const first = join(projectRoot, "src/alpha.ts");
  const second = join(projectRoot, "src/beta.tsx");
  const expected = [first, second];

  it("accepts exactly the configured absolute source paths", () => {
    expect(() =>
      validateCoverageFiles({ [second]: {}, [first]: {} }, expected),
    ).not.toThrow();
  });

  it.each([null, [], "invalid"])(
    "rejects malformed coverage %j",
    (coverage) => {
      expect(() => validateCoverageFiles(coverage, expected)).toThrow(
        /coverage/i,
      );
    },
  );

  it("rejects an omitted source", () => {
    expect(() => validateCoverageFiles({ [first]: {} }, expected)).toThrow(
      /missing/i,
    );
  });

  it("rejects an unexpected source", () => {
    expect(() =>
      validateCoverageFiles(
        { [first]: {}, [second]: {}, "/extra.ts": {} },
        expected,
      ),
    ).toThrow(/unexpected/i);
  });

  it("rejects a checkout path mismatch instead of stripping the prefix", () => {
    expect(() =>
      validateCoverageFiles(
        { "/different/src/alpha.ts": {}, [second]: {} },
        expected,
      ),
    ).toThrow(/missing/i);
  });

  it("rejects relative coverage keys", () => {
    expect(() =>
      validateCoverageFiles({ "src/alpha.ts": {}, [second]: {} }, expected),
    ).toThrow(/inventory/i);
  });

  it.each([
    { files: [] },
    { files: [first, first] },
    { files: ["src/alpha.ts"] },
  ])("rejects invalid expected source inventories %j", ({ files }) => {
    expect(() => validateCoverageFiles({ [first]: {} }, files)).toThrow(
      /inventory|absolute|duplicate/i,
    );
  });
});
