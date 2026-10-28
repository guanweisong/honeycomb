// @vitest-environment node

import { runTestProcess } from "@tests/helpers/run-test-process";
import { describe, expect, it } from "vitest";
import {
  assertE2EPreflightEnvironment,
  parseE2EArguments,
} from "../../scripts/e2e-preflight";

describe("E2E preflight policy", () => {
  it.each(
    [
      ["--grep", "--list", "--output=elsewhere"],
      ["--grep", "--", "--config=elsewhere"],
      ["--ui", "--list"],
      ["--ui", "--help"],
      ["--reporter=./custom.ts"],
      ["--reporter=html", "--list"],
      ["--add-reporter=json"],
      ["--update-snapshots"],
      ["-xuall"],
      ["--run-agents=all"],
      ["--tsconfig=another.json"],
      ["--ui-host=0.0.0.0"],
    ].map((args) => ({ args })),
  )("rejects unsafe or ambiguous %j", ({ args }) => {
    expect(() => parseE2EArguments(args)).toThrow();
  });

  it("preserves ordinary selectors, worker counts, debug and stdout inventory", () => {
    expect(
      parseE2EArguments([
        "--project",
        "chromium",
        "-g@smoke",
        "-j",
        "2",
        "--debug",
        "--list",
        "--reporter=json",
        "tests/e2e/security-headers.spec.ts",
      ]),
    ).toEqual({
      inspection: true,
      args: [
        "--project=chromium",
        "--grep=@smoke",
        "--workers=2",
        "--debug=inspector",
        "--list",
        "--reporter=json",
        "--",
        "tests/e2e/security-headers.spec.ts",
      ],
    });
    expect(
      parseE2EArguments(["--only-changed", "--headed", "-x"]).args,
    ).toEqual(["--only-changed=HEAD", "--headed", "-x"]);
    expect(parseE2EArguments(["--debug=cli"]).args).toEqual(["--debug=cli"]);
  });

  it("keeps flag-like values and delimiter filters distinct from inspection", () => {
    expect(parseE2EArguments(["--grep=--list", "--", "--help"])).toEqual({
      inspection: false,
      args: ["--grep=--list", "--", "--help"],
    });
    expect(parseE2EArguments(["-g--help"]).inspection).toBe(false);
    expect(
      parseE2EArguments(["--", "--list", "--output=filter"]).inspection,
    ).toBe(false);
  });

  it("allows standalone UI and uses stdout for read-only help/list", () => {
    expect(parseE2EArguments(["--ui"])).toEqual({
      inspection: false,
      args: ["--ui"],
    });
    expect(parseE2EArguments(["-h"])).toEqual({
      inspection: true,
      args: ["--help", "--reporter=list"],
    });
    expect(parseE2EArguments(["--list"]).args).toEqual([
      "--list",
      "--reporter=list",
    ]);
    expect(() => assertE2EPreflightEnvironment({}, true)).not.toThrow();
    expect(() => assertE2EPreflightEnvironment({}, false)).toThrow(/E2E_SEED/);
  });

  it.each([
    "PLAYWRIGHT_HTML_OUTPUT_DIR",
    "PLAYWRIGHT_HTML_REPORT",
    "PLAYWRIGHT_JSON_OUTPUT_FILE",
    "PLAYWRIGHT_JUNIT_OUTPUT_NAME",
    "PLAYWRIGHT_BLOB_OUTPUT_DIR",
    "PLAYWRIGHT_PERFETTO_OUTPUT_FILE",
    "PLAYWRIGHT_LAST_RUN_OUTPUT_FILE",
    "PW_TEST_REPORTER",
  ])("rejects the report destination environment override %s", (key) => {
    expect(() =>
      assertE2EPreflightEnvironment({ [key]: "synthetic-path" }, true),
    ).toThrow(/Report destination override/);
  });
});

describe("E2E package entrypoint", () => {
  it.each(
    [
      ["--output=outside-owned-run"],
      ["--config=playwright.config.ts"],
      ["-c", "playwright.config.ts"],
      ["--last-failed-file=outside-owned-run.json"],
    ].map((args) => ({ args })),
  )(
    "rejects destination overrides %j even during inspection",
    async ({ args }) => {
      const result = await runTestProcess(
        "bun",
        ["run", "test:e2e", ...args, "--list", "--reporter=json"],
        {
          cwd: process.cwd(),
          env: { ...process.env, TURSO_URL: "libsql://synthetic.invalid" },
          timeout: 30_000,
        },
      );
      expect(result.status, result.stdout + result.stderr).not.toBe(0);
      expect(result.stderr).toMatch(/E2E preflight/);
    },
    40_000,
  );

  it.each([
    "test:e2e",
    "test:e2e:development",
    "test:e2e:production",
    "test:e2e:smoke",
    "test:e2e:regression",
  ])(
    "keeps %s inspection usable without a test database",
    async (script) => {
      const result = await runTestProcess(
        "bun",
        ["run", script, "--list", "--reporter=json"],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            E2E_SEED: "0",
            TURSO_URL: "libsql://synthetic.invalid",
          },
          timeout: 30_000,
        },
      );
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toHaveProperty("suites");
    },
    40_000,
  );

  it("rejects UI inspection before starting the interactive server", async () => {
    const result = await runTestProcess(
      "bun",
      ["run", "test:e2e:ui", "--list"],
      {
        cwd: process.cwd(),
        timeout: 10_000,
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("UI mode cannot be combined");
  });
});
