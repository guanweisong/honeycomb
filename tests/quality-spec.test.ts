import { spawnSync } from "node:child_process";
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

it("quality:spec forwards strict flags and blocks validator failures and whitespace errors", () => {
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
  const run = (command: string, args: string[], status = "0") =>
    spawnSync(command, args, {
      cwd: fixture,
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "false",
        QUALITY_DIFF_BASE_SHA: undefined,
        PATH: `${bin}:${process.env.PATH}`,
        TEST_SPEC_STATUS: status,
      },
    });
  expect(run("git", ["init", "-q"]).status).toBe(0);
  mkdirSync(join(fixture, "openspec/specs/example"), { recursive: true });
  const specPath = join(fixture, "openspec/specs/example/spec.md");
  const valid =
    "# Example\n\n## Purpose\n\nProvide a controlled fixture that demonstrates strict specification checks.\n\n## Requirements\n\n### Requirement: Example validation\nThe system SHALL validate the example.\n\n#### Scenario: Valid input\n- **WHEN** input is valid\n- **THEN** validation succeeds\n";
  writeFileSync(specPath, valid);
  expect(run("git", ["add", "package.json", "openspec"]).status).toBe(0);
  const clean = run("bun", ["run", "quality:spec"]);
  expect(clean.status, clean.stdout + clean.stderr).toBe(0);
  writeFileSync(specPath, "# Invalid specification\n");
  expect(run("bun", ["run", "quality:spec"], "1").status).not.toBe(0);
  writeFileSync(specPath, valid + "\nTrailing whitespace   \n");
  const whitespace = run("bun", ["run", "quality:spec"]);
  expect(whitespace.status).not.toBe(0);
  expect(whitespace.stdout + whitespace.stderr).toContain(
    "trailing whitespace",
  );

  writeFileSync(specPath, valid);
  const commit = () => {
    expect(run("git", ["add", "--all"]).status).toBe(0);
    expect(
      run("git", [
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.test",
        "commit",
        "-qm",
        "fixture",
      ]).status,
    ).toBe(0);
    return run("git", ["rev-parse", "HEAD"]).stdout.trim();
  };
  const base = commit();
  writeFileSync(specPath, valid + "\nClean committed change\n");
  commit();
  const checkRange = (baseSha: string) =>
    spawnSync("bun", ["run", "quality:spec"], {
      cwd: fixture,
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "true",
        PATH: `${bin}:${process.env.PATH}`,
        QUALITY_DIFF_BASE_SHA: baseSha,
        TEST_SPEC_STATUS: "0",
      },
    });
  expect(checkRange(base).status).toBe(0);
  for (const fallbackBase of [
    "0".repeat(40),
    "invalid; touch SHOULD_NOT_EXIST",
    "f".repeat(40),
  ]) {
    expect(checkRange(fallbackBase).status).toBe(0);
  }
  writeFileSync(specPath, valid + "\nCommitted trailing whitespace   \n");
  commit();
  expect(checkRange(base).status).not.toBe(0);
  for (const invalidBase of [
    "0".repeat(40),
    "invalid; touch SHOULD_NOT_EXIST",
    "f".repeat(40),
  ]) {
    expect(checkRange(invalidBase).status).not.toBe(0);
  }
  expect(existsSync(join(fixture, "SHOULD_NOT_EXIST"))).toBe(false);
}, 30_000);
