import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({
  cwd: process.cwd(),
  overrideConfigFile: "eslint-config-next.ts",
});

async function lintConsoleAt(filePath: string) {
  const [result] = await eslint.lintText("console.log('test');\n", { filePath });

  return result.messages.filter((message) => message.ruleId === "no-console");
}

describe("console lint boundary", () => {
  it.each([
    "src/auth.ts",
    "src/instrumentation.ts",
    "src/env/server.ts",
    "src/app/api/health/route.ts",
    "src/packages/trpc/api/context.ts",
  ])("forbids console usage in %s", async (filePath) => {
    await expect(lintConsoleAt(filePath)).resolves.toHaveLength(1);
  });

  it("allows console usage only in the console logger adapter", async () => {
    await expect(
      lintConsoleAt("src/packages/infrastructure/observability/adapters/console.ts"),
    ).resolves.toHaveLength(0);
  });
});
