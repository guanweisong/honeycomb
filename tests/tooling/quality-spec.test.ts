import { runTestProcess } from "@tests/helpers/run-test-process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

let fixture = "";
afterEach(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

it("quality:spec forwards strict flags and blocks validator failures and whitespace errors", async () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  expect(manifest.scripts["quality:spec"]).toBeDefined();
  fixture = mkdtempSync(join(tmpdir(), "honeycomb-quality-spec-"));
  writeFileSync(
    join(fixture, "package.json"),
    JSON.stringify({
      scripts: { "quality:spec": manifest.scripts["quality:spec"] },
    }),
  );
  const bin = join(fixture, "bin");
  if (existsSync("scripts/check-diff.ts")) {
    mkdirSync(join(fixture, "scripts"));
    copyFileSync(
      resolve("scripts/check-diff.ts"),
      join(fixture, "scripts/check-diff.ts"),
    );
  }
  mkdirSync(bin);
  // The CLI is installed only in the credential-free CI spec job. This
  // controlled executable tests our shell contract without a global install.
  writeFileSync(
    join(bin, "openspec"),
    '#!/bin/sh\n[ "$*" = "validate --all --strict" ] || exit 64\nexit "${TEST_SPEC_STATUS:-0}"\n',
    { mode: 0o755 },
  );
  const run = async (command: string, args: string[], status = "0") => {
    const result = await runTestProcess(command, args, {
      cwd: fixture,
      timeout: 5_000,
      env: {
        ...process.env,
        CI: "false",
        QUALITY_DIFF_BASE_SHA: undefined,
        PATH: `${bin}:${process.env.PATH}`,
        TEST_SPEC_STATUS: status,
      },
    });
    return result;
  };
  expect((await run("git", ["init", "-q"])).status).toBe(0);
  mkdirSync(join(fixture, "openspec/specs/example"), { recursive: true });
  const specPath = join(fixture, "openspec/specs/example/spec.md");
  const valid =
    "# Example\n\n## Purpose\n\nProvide a controlled fixture that demonstrates strict specification checks.\n\n## Requirements\n\n### Requirement: Example validation\nThe system SHALL validate the example.\n\n#### Scenario: Valid input\n- **WHEN** input is valid\n- **THEN** validation succeeds\n";
  writeFileSync(specPath, valid);
  expect((await run("git", ["add", "package.json", "openspec"])).status).toBe(
    0,
  );
  const clean = await run("bun", ["run", "quality:spec"]);
  expect(clean.status, clean.stdout + clean.stderr).toBe(0);
  writeFileSync(specPath, "# Invalid specification\n");
  expect((await run("bun", ["run", "quality:spec"], "1")).status).not.toBe(0);
  writeFileSync(specPath, valid + "\nTrailing whitespace   \n");
  const whitespace = await run("bun", ["run", "quality:spec"]);
  expect(whitespace.status).not.toBe(0);
  expect(whitespace.stdout + whitespace.stderr).toContain(
    "trailing whitespace",
  );

  writeFileSync(specPath, valid);
  const commit = async () => {
    expect((await run("git", ["add", "--all"])).status).toBe(0);
    expect(
      (
        await run("git", [
          "-c",
          "user.name=Fixture",
          "-c",
          "user.email=fixture@example.test",
          "commit",
          "-qm",
          "fixture",
        ])
      ).status,
    ).toBe(0);
    return (await run("git", ["rev-parse", "HEAD"])).stdout.trim();
  };
  const base = await commit();
  writeFileSync(specPath, valid + "\nClean committed change\n");
  await commit();
  const checkRange = async (baseSha: string) => {
    const result = await runTestProcess("bun", ["run", "quality:spec"], {
      cwd: fixture,
      timeout: 5_000,
      env: {
        ...process.env,
        CI: "true",
        PATH: `${bin}:${process.env.PATH}`,
        QUALITY_DIFF_BASE_SHA: baseSha,
        TEST_SPEC_STATUS: "0",
      },
    });
    return result;
  };
  expect((await checkRange(base)).status).toBe(0);
  for (const fallbackBase of [
    "0".repeat(40),
    "invalid; touch SHOULD_NOT_EXIST",
    "f".repeat(40),
  ]) {
    expect((await checkRange(fallbackBase)).status).toBe(0);
  }
  writeFileSync(specPath, valid + "\nCommitted trailing whitespace   \n");
  await commit();
  expect((await checkRange(base)).status).not.toBe(0);
  for (const invalidBase of [
    "0".repeat(40),
    "invalid; touch SHOULD_NOT_EXIST",
    "f".repeat(40),
  ]) {
    expect((await checkRange(invalidBase)).status).not.toBe(0);
  }
  expect(existsSync(join(fixture, "SHOULD_NOT_EXIST"))).toBe(false);
}, 30_000);
