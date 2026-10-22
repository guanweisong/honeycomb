// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const isIgnored = (path: string) =>
  spawnSync("git", ["check-ignore", "--no-index", "--quiet", path], {
    cwd: root,
  }).status === 0;

describe("generated types and local environment Git hygiene", () => {
  it.each([
    "next-env.d.ts",
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
    ".env.production.local",
  ])("ignores %s without opening or creating the file", (path) => {
    expect(isIgnored(path)).toBe(true);
  });

  it("keeps narrowly named example templates trackable", () => {
    expect(isIgnored(".env.example")).toBe(false);
    expect(isIgnored(".env.test.example")).toBe(false);
  });

  it("does not track Next-generated declarations", () => {
    expect(
      execFileSync("git", ["ls-files", "--", "next-env.d.ts"], {
        cwd: root,
        encoding: "utf8",
      }).trim(),
    ).toBe("");
  });

  it("retains generated declarations in the TypeScript include contract", () => {
    const config = JSON.parse(readFileSync(resolve(root, "tsconfig.json"), "utf8"));
    expect(config.include).toContain("next-env.d.ts");
  });
});
