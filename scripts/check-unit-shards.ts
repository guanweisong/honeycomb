import { deepEqual } from "node:assert/strict";
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { globSync } from "tinyglobby";
import { z } from "zod";
import vitestConfig from "../vitest.config.mts";

const count = z.number().int().nonnegative();
const inventorySchema = z
  .array(
    z.object({
      name: z.string().min(1),
      file: z.string().min(1),
    }),
  )
  .min(1);

// Validate the public JSON reporter fields we consume. Blob serialization is
// deliberately opaque here and remains owned by Vitest's native merge command.
const reportSchema = z.object({
  success: z.literal(true),
  numFailedTests: z.literal(0),
  numFailedTestSuites: z.literal(0),
  numPendingTests: z.literal(0),
  numPendingTestSuites: z.literal(0),
  numTodoTests: z.literal(0),
  numTotalTests: count,
  numPassedTests: count,
  numTotalTestSuites: count,
  numPassedTestSuites: count,
  startTime: z.number().nonnegative(),
  testResults: z
    .array(
      z.object({
        name: z.string().min(1),
        status: z.literal("passed"),
        message: z.literal(""),
        startTime: z.number().nonnegative(),
        endTime: z.number().nonnegative(),
        assertionResults: z
          .array(
            z.object({
              ancestorTitles: z.array(z.string()),
              title: z.string(),
              fullName: z.string(),
              status: z.literal("passed"),
              failureMessages: z.array(z.string()).length(0).nullable(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

function relativeFilename(filename: string, root: string): string {
  if (!isAbsolute(filename)) {
    throw new Error(`Test filename must be an absolute path: ${filename}`);
  }
  const path = relative(resolve(root), filename);
  if (
    !path ||
    path === ".." ||
    path.startsWith(`..${sep}`) ||
    isAbsolute(path)
  ) {
    throw new Error(
      `Test filename is outside the repository root: ${filename}`,
    );
  }
  return path.split(sep).join("/");
}

function expectedInventory(inventory: unknown, root: string) {
  const parsed = inventorySchema.safeParse(inventory);
  if (!parsed.success)
    throw new Error(`Invalid test inventory: ${parsed.error.message}`);
  const files = new Set<string>();
  const cases: string[] = [];
  for (const test of parsed.data) {
    const file = relativeFilename(test.file, root);
    files.add(file);
    cases.push(JSON.stringify([file, test.name]));
  }
  return { files, cases };
}

function reportInventory(report: unknown, root: string) {
  const parsed = reportSchema.safeParse(report);
  if (!parsed.success) {
    throw new Error(
      `Invalid or non-passing Vitest report: ${parsed.error.message}`,
    );
  }
  const result = parsed.data;
  const files = new Set<string>();
  const cases: string[] = [];
  for (const fileResult of result.testResults) {
    const file = relativeFilename(fileResult.name, root);
    if (files.has(file))
      throw new Error(`Duplicate test file in report: ${file}`);
    files.add(file);
    for (const assertion of fileResult.assertionResults) {
      cases.push(
        JSON.stringify([
          file,
          [...assertion.ancestorTitles, assertion.title].join(" > "),
        ]),
      );
    }
  }
  if (
    result.numTotalTests !== cases.length ||
    result.numPassedTests !== cases.length ||
    result.numTotalTestSuites < files.size ||
    result.numPassedTestSuites !== result.numTotalTestSuites
  ) {
    throw new Error(
      "Vitest report counts do not match its passed files and cases",
    );
  }
  return { files, cases };
}

function assertSameFiles(
  actual: Set<string>,
  expected: Set<string>,
  label: string,
): void {
  const missing = [...expected].filter((file) => !actual.has(file));
  const extra = [...actual].filter((file) => !expected.has(file));
  if (missing.length || extra.length) {
    throw new Error(
      `${label} file inventory mismatch: missing ${JSON.stringify(missing)}, unexpected ${JSON.stringify(extra)}`,
    );
  }
}

function assertSameInventory(
  actual: ReturnType<typeof reportInventory>,
  expected: ReturnType<typeof expectedInventory>,
): void {
  assertSameFiles(actual.files, expected.files, "Test");
  deepEqual(
    actual.cases.sort(),
    expected.cases.sort(),
    "Test case inventory mismatch",
  );
}

export function validateMergedReport(
  report: unknown,
  inventory: unknown,
  root: string,
): void {
  assertSameInventory(
    reportInventory(report, root),
    expectedInventory(inventory, root),
  );
}

export function validateCoverageFiles(
  coverage: unknown,
  expectedFiles: string[],
): void {
  if (
    typeof coverage !== "object" ||
    coverage === null ||
    Array.isArray(coverage)
  ) {
    throw new Error("Invalid coverage map: expected a file-keyed JSON object");
  }
  if (
    expectedFiles.length === 0 ||
    expectedFiles.some((file) => !isAbsolute(file))
  ) {
    throw new Error(
      "Expected coverage file inventory must contain absolute paths",
    );
  }
  const expected = new Set(expectedFiles);
  if (expected.size !== expectedFiles.length) {
    throw new Error("Duplicate file in expected coverage inventory");
  }
  // Hosted jobs use the same checkout path. Prefix stripping could conceal
  // coverage from a different checkout, so these keys must match exactly.
  assertSameFiles(new Set(Object.keys(coverage)), expected, "Coverage");
}

function requireDirectory(path: string): void {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`Expected a real directory, not a symlink: ${path}`);
  }
}

function requireFile(path: string): void {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`Expected a regular file, not a symlink: ${path}`);
  }
}

function readJson(path: string): unknown {
  requireFile(path);
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}`, { cause: error });
  }
}

function requireEntries(path: string, expected: string[]): void {
  requireDirectory(path);
  const actual = readdirSync(path).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    throw new Error(
      `Artifact directory must contain exactly ${expected.join(", ")}: ${path}; received ${actual.join(", ")}`,
    );
  }
}

export function validateShardArtifacts(
  artifacts: string,
  inventory: unknown,
  output: string,
  root: string,
): void {
  requireEntries(artifacts, ["unit-shard-1", "unit-shard-2"]);
  const expected = expectedInventory(inventory, root);
  const combined: ReturnType<typeof reportInventory> = {
    files: new Set(),
    cases: [],
  };
  const blobs: string[] = [];
  for (const shard of [1, 2]) {
    const directory = join(artifacts, `unit-shard-${shard}`);
    requireEntries(directory, ["blob.json", "results.json"]);
    const blob = join(directory, "blob.json");
    requireFile(blob);
    if (!readFileSync(blob, "utf8").trim())
      throw new Error(`Empty shard blob: ${blob}`);
    const actual = reportInventory(
      readJson(join(directory, "results.json")),
      root,
    );
    for (const file of actual.files) {
      if (combined.files.has(file))
        throw new Error(
          `Overlapping duplicate test file between shards: ${file}`,
        );
      combined.files.add(file);
    }
    combined.cases.push(...actual.cases);
    blobs.push(blob);
  }
  assertSameInventory(combined, expected);
  const existing = lstatSync(output, { throwIfNoEntry: false });
  if (existing) requireEntries(output, []);
  else mkdirSync(output, { recursive: true });
  for (const [index, blob] of blobs.entries()) {
    copyFileSync(blob, join(output, `shard-${index + 1}.json`));
  }
}

export function runChecks(args: readonly string[], root: string): string {
  const [first, second, third] = args;
  if (args.length !== 3 || !first || !second || !third) {
    throw new Error(
      "Usage: check-unit-shards.ts <artifact-root> <inventory.json> <blob-output-directory> OR --merged <results.json> <inventory.json>",
    );
  }
  if (first === "--merged") {
    validateMergedReport(readJson(second), readJson(third), root);
    const coverage = vitestConfig.test?.coverage;
    if (!coverage?.include?.length)
      throw new Error("Coverage include inventory is not configured");
    const expectedFiles = globSync(coverage.include, {
      cwd: root,
      absolute: true,
      ignore: coverage.exclude,
    });
    validateCoverageFiles(
      readJson(join(dirname(second), "coverage-final.json")),
      expectedFiles,
    );
    return "Merged unit test and coverage inventories validated.";
  }
  validateShardArtifacts(first, readJson(second), third, root);
  return "Both unit shards passed exact file and case inventory validation.";
}

if (import.meta.main) {
  process.stdout.write(`${runChecks(process.argv.slice(2), process.cwd())}\n`);
}
