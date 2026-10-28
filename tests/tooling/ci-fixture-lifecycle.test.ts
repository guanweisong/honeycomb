// @vitest-environment node
import {
  existsSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runTestProcess } from "@tests/helpers/run-test-process";

const helper = resolve("scripts/ci-fixture-lifecycle.sh");

async function runFixture(body: string, setup?: (directory: string) => string) {
  const directory = mkdtempSync(join(tmpdir(), "honeycomb-lifecycle-check-"));
  const fixture = join(directory, "owned");
  try {
    const result = await runTestProcess(
      "bash",
      [
        "-e",
        "-o",
        "pipefail",
        "-c",
        `
      mkdir "$HONEYCOMB_TEST_DIR"
      ${setup?.(directory) ?? ""}
      source "$1"
      ${body}
    `,
        "fixture-test",
        helper,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HONEYCOMB_TEST_DIR: fixture,
          GITHUB_STEP_SUMMARY: "",
        },
        timeout: 5_000,
      },
    );
    return { ...result, remaining: existsSync(fixture) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("CI fixture lifecycle", () => {
  it.each([0, 7])(
    "keeps phase exit %i and removes only its fixture",
    async (code) => {
      const result = await runFixture(
        `phase "checked" bash -c 'exit ${code}'; printf REACHED`,
      );
      expect(result.status, result.stderr).toBe(code);
      expect(result.stdout).toContain(`checked:`);
      expect(result.stdout).toContain(`exit=${code}`);
      expect(result.stdout.includes("REACHED")).toBe(code === 0);
      expect(result.remaining).toBe(false);
    },
  );

  it.each([
    ["HUP", 129],
    ["INT", 130],
    ["TERM", 143],
  ] as const)(
    "preserves %s signal status and cleans the fixture",
    async (signal, code) => {
      const result = await runFixture(`kill -${signal} $$`);
      expect(result.status, result.stderr).toBe(code);
      expect(result.remaining).toBe(false);
    },
  );

  it("refuses symlink cleanup and leaves its target intact", async () => {
    const target = mkdtempSync(join(tmpdir(), "honeycomb-lifecycle-target-"));
    try {
      const marker = join(target, "keep");
      writeFileSync(marker, "not owned by shell");
      const result = await runFixture("true", (directory) => {
        symlinkSync(target, join(directory, "link"));
        return `rmdir "$HONEYCOMB_TEST_DIR"; mv "${join(directory, "link")}" "$HONEYCOMB_TEST_DIR"`;
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("could not verify ownership");
      expect(existsSync(marker)).toBe(true);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("refuses an ownership mismatch", async () => {
    const result = await runFixture("true", () => "stat() { printf 999999; }");
    expect(result.status).toBe(1);
    expect(result.remaining).toBe(true);
    expect(result.stderr).toContain("could not verify ownership");
  });

  it("reports a failed removal as failure", async () => {
    const result = await runFixture("true", () => "rm() { return 9; }");
    expect(result.status).toBe(1);
    expect(result.remaining).toBe(true);
  });

  it("fails a successful phase if summary output fails and still cleans", async () => {
    const result = await runFixture(
      'export GITHUB_STEP_SUMMARY="$HONEYCOMB_TEST_DIR/missing/summary"; phase checked true',
    );
    expect(result.status).toBe(1);
    expect(result.remaining).toBe(false);
  });
});
