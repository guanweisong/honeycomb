import { describe, expect, it } from "vitest";
import { argumentValue, requiredEnvironmentVariable } from "../scripts/cli";
import { quoteSqliteIdentifier } from "../scripts/sqlite";

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
