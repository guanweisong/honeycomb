import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { argumentValue, requiredEnvironmentVariable } from "../../scripts/cli";
import { quoteSqliteIdentifier } from "../../scripts/sqlite";

describe("script utilities", () => {
  it("reads argument values without depending on the global process arguments", () => {
    expect(
      argumentValue("--output", [
        "bun",
        "script.ts",
        "--output",
        "report.json",
      ]),
    ).toBe("report.json");
    expect(argumentValue("--missing", ["bun", "script.ts"])).toBeUndefined();
  });

  it("lets the schema audit caller choose an output without a shadowing package default", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    expect(manifest.scripts["db:schema:audit"]).not.toContain("--output");
  });

  it("requires a non-empty environment value", () => {
    expect(requiredEnvironmentVariable("TOKEN", { TOKEN: "secret" })).toBe(
      "secret",
    );
    expect(() => requiredEnvironmentVariable("TOKEN", {})).toThrow(
      "TOKEN is required",
    );
  });

  it("quotes embedded double quotes in SQLite identifiers", () => {
    expect(quoteSqliteIdentifier('odd"table')).toBe('"odd""table"');
  });
});
