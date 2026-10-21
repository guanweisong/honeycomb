import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { constants } from "node:os";
import { resolve } from "node:path";
import { parseArgs, type ParseArgsConfig } from "node:util";
import {
  assertNoE2EDotenvFiles,
  assertSafeE2ESeedTarget,
} from "./e2e-seed-policy";

// Verification supports ordinary selectors and diagnostics, not alternate
// execution configuration, arbitrary reporters, or source-authoring commands.
const options = {
  help: { type: "boolean", short: "h" },
  list: { type: "boolean" },
  ui: { type: "boolean" },
  headed: { type: "boolean" },
  "fail-on-flaky-tests": { type: "boolean" },
  "forbid-only": { type: "boolean" },
  "fully-parallel": { type: "boolean" },
  "ignore-snapshots": { type: "boolean" },
  "last-failed": { type: "boolean" },
  "no-deps": { type: "boolean" },
  "pass-with-no-tests": { type: "boolean" },
  quiet: { type: "boolean" },
  x: { type: "boolean" },
  browser: { type: "string" },
  debug: { type: "string" },
  "only-changed": { type: "string" },
  "global-timeout": { type: "string" },
  grep: { type: "string", short: "g" },
  "grep-invert": { type: "string", short: "G" },
  "max-failures": { type: "string" },
  project: { type: "string", multiple: true },
  "repeat-each": { type: "string" },
  reporter: { type: "string" },
  retries: { type: "string" },
  shard: { type: "string" },
  "test-list": { type: "string" },
  "test-list-invert": { type: "string" },
  timeout: { type: "string" },
  trace: { type: "string" },
  workers: { type: "string", short: "j" },
} satisfies ParseArgsConfig["options"];
const stdoutReporters = new Set([
  "list",
  "line",
  "dot",
  "json",
  "junit",
  "null",
  "github",
]);

/** 只验证参数；清单和帮助不创建数据库或启动服务。 */
export function parseE2EArguments(args: readonly string[]) {
  const delimiter = args.indexOf("--");
  const normalized = args.map((arg, index) => {
    if (delimiter !== -1 && index >= delimiter) return arg;
    if (arg !== "--debug" && arg !== "--only-changed") return arg;
    const next = args[index + 1];
    if (next && !next.startsWith("-")) return arg;
    return `${arg}=${arg === "--debug" ? "inspector" : "HEAD"}`;
  });
  const parsed = parseArgs({
    args: normalized,
    options,
    allowPositionals: true,
    strict: true,
    tokens: true,
  });
  const inspection = Boolean(parsed.values.list || parsed.values.help);
  if (inspection && parsed.values.ui)
    throw new Error("UI mode cannot be combined with list/help");
  if (
    parsed.values.reporter
      ?.split(",")
      .some((name) => !stdoutReporters.has(name))
  )
    throw new Error("Reporter overrides must use built-in stdout reporters");

  // Re-emit parsed options so Commander cannot reinterpret flag-like values.
  const commandArgs = parsed.tokens.flatMap((token) => {
    if (token.kind !== "option") return [];
    const name = token.name === "x" ? "-x" : `--${token.name}`;
    return [token.value === undefined ? name : `${name}=${token.value}`];
  });
  if (inspection && !parsed.values.reporter)
    commandArgs.push("--reporter=list");
  if (parsed.positionals.length) commandArgs.push("--", ...parsed.positionals);
  return { args: commandArgs, inspection };
}

/** 拒绝绕过配置的报告路径；真实运行复用现有独占目录证明。 */
export function assertE2EPreflightEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
  inspection: boolean,
) {
  for (const [key, value] of Object.entries(environment)) {
    if (
      value &&
      (/^PLAYWRIGHT_(?:HTML|BLOB|JSON|JUNIT|PERFETTO)_(?:OUTPUT_|REPORT)/.test(
        key,
      ) ||
        key === "PLAYWRIGHT_LAST_RUN_OUTPUT_FILE" ||
        key === "PW_TEST_REPORTER")
    )
      throw new Error(`Report destination override is not allowed: ${key}`);
  }
  if (!inspection) {
    assertSafeE2ESeedTarget(environment);
    assertNoE2EDotenvFiles(process.cwd());
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve("scripts/e2e-preflight.ts")
) {
  try {
    const invocation = parseE2EArguments(process.argv.slice(2));
    assertE2EPreflightEnvironment(process.env, invocation.inspection);
    const nodeRequire = createRequire(resolve("package.json"));
    const child = spawn(
      "node",
      [nodeRequire.resolve("@playwright/test/cli"), "test", ...invocation.args],
      {
        stdio: "inherit",
        env: { ...process.env, PLAYWRIGHT_HTML_OPEN: "never" },
      },
    );
    // Playwright still owns its server lifecycle. Forward only to this child;
    // never inspect, adopt, or signal other processes or clean run resources.
    const signals = ["SIGHUP", "SIGINT", "SIGTERM"] as const;
    const handlers = signals.map((signal) => {
      const handler = () => {
        child.kill(signal);
      };
      process.on(signal, handler);
      return [signal, handler] as const;
    });
    child.once("error", (error) => {
      process.stderr.write(`E2E preflight: ${error.message}\n`);
      process.exitCode = 1;
    });
    child.once("close", (code, signal) => {
      handlers.forEach(([name, handler]) =>
        process.removeListener(name, handler),
      );
      process.exitCode = code ?? (signal ? 128 + constants.signals[signal] : 1);
    });
  } catch (error) {
    process.stderr.write(
      `E2E preflight: ${error instanceof Error ? error.message : "invalid invocation"}\n`,
    );
    process.exitCode = 1;
  }
}
