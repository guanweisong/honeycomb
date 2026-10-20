import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};
const workflow = readFileSync(".github/workflows/quality.yml", "utf8");
const gitignore = readFileSync(".gitignore", "utf8");
const trackedFiles = execFileSync("git", ["ls-files"], {
  encoding: "utf8",
})
  .trim()
  .split("\n");

describe("database migration governance", () => {
  it("tracks Drizzle migration artifacts", () => {
    expect(gitignore.split("\n")).not.toContain("drizzle");
    expect(trackedFiles).toContain("drizzle/meta/_journal.json");
    expect(
      trackedFiles.some((file) => /^drizzle\/\d+.*\.sql$/.test(file)),
    ).toBe(true);
  });

  it("checks migration consistency in CI", () => {
    expect(packageJson.scripts?.["db:migrations:check"]).toBe(
      "bun scripts/check-migrations.ts",
    );
    expect(workflow).toContain("bun run db:migrations:check");
  });
});
