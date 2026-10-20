import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertSafeE2ESeedTarget,
  assertNoE2EDotenvFiles,
  initializeE2ETestTarget,
} from "../../scripts/e2e-seed-policy";

describe("E2E seed safety policy", () => {
  let directory: string;
  let environment: Record<string, string>;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-policy-"));
    environment = {
      E2E_SEED: "1",
      HONEYCOMB_TEST_DIR: directory,
      TURSO_URL: `file:${directory}/test.db`,
      TURSO_TOKEN: "e2e-local-only",
    };
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
  });
  it("rejects an unregistered existing local database", () => {
    writeFileSync(join(directory, "test.db"), "untouched");
    expect(() => assertSafeE2ESeedTarget(environment)).toThrow();
  });
  it("allows the owned directory to contain child-process temporary files", () => {
    initializeE2ETestTarget(environment);
    vi.stubEnv("TMPDIR", directory);
    expect(assertSafeE2ESeedTarget(environment)).toBe(environment.TURSO_URL);
  });
  it("refuses dotenv reload without reading or exposing file contents", () => {
    writeFileSync(
      join(directory, ".env.production"),
      "PRIVATE_SECRET=never-print-me",
    );
    expect(() => assertNoE2EDotenvFiles(directory)).toThrow(/\.env.production/);
    expect(() => assertNoE2EDotenvFiles(directory)).not.toThrow(
      /never-print-me/,
    );
  });
  it("does not adopt any nonempty directory", () => {
    writeFileSync(join(directory, "existing.txt"), "preserve");
    expect(() => initializeE2ETestTarget(environment)).toThrow(
      /fresh and empty/,
    );
  });
  it("rejects a repository directory and a symbolic-link directory", () => {
    expect(() =>
      initializeE2ETestTarget({
        ...environment,
        HONEYCOMB_TEST_DIR: process.cwd(),
        TURSO_URL: `file:${process.cwd()}/test.db`,
      }),
    ).toThrow();
    const alias = join(directory, "alias");
    symlinkSync(directory, alias);
    expect(() =>
      initializeE2ETestTarget({
        ...environment,
        HONEYCOMB_TEST_DIR: alias,
        TURSO_URL: `file:${alias}/test.db`,
      }),
    ).toThrow();
  });
  it("registers only a fresh directory and permits subsequent seed/application access", () => {
    initializeE2ETestTarget(environment);
    expect(assertSafeE2ESeedTarget(environment)).toBe(environment.TURSO_URL);
    writeFileSync(join(directory, "test.db"), "test fixture");
    expect(assertSafeE2ESeedTarget(environment)).toBe(environment.TURSO_URL);
    expect(() => initializeE2ETestTarget(environment)).toThrow();
  });
  it.each([
    "file:./dev.db",
    "file:/existing-production-copy.db",
    "file:/tmp/example/../../dev.db",
    "libsql://production.example.com",
    "file://remote/test.db",
    "",
  ])("rejects unsafe target %s", (url) => {
    expect(() =>
      assertSafeE2ESeedTarget({ ...environment, TURSO_URL: url }),
    ).toThrow();
  });
  it("requires opt-in and sentinel credentials", () => {
    expect(() =>
      assertSafeE2ESeedTarget({ ...environment, E2E_SEED: "0" }),
    ).toThrow(/E2E_SEED/);
    expect(() =>
      assertSafeE2ESeedTarget({
        ...environment,
        TURSO_TOKEN: "inherited-token",
      }),
    ).toThrow();
  });
  it("rejects symlink database files", () => {
    initializeE2ETestTarget(environment);
    symlinkSync("/nonexistent", join(directory, "test.db"));
    expect(() => assertSafeE2ESeedTarget(environment)).toThrow();
  });
});
