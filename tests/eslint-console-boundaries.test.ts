import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("server console lint boundary", () => {
  it("covers server packages and only exempts the console logger adapter", () => {
    const source = readFileSync(
      resolve(process.cwd(), "eslint-config-next.ts"),
      "utf8",
    );

    expect(source).toContain('"src/packages/**/*.{ts,tsx}"');
    expect(source).toContain('"src/packages/observability/adapters/console.ts"');
    expect(source).toMatch(/files:[\s\S]*console\.ts[\s\S]*"no-console":\s*"off"/);
  });
});
