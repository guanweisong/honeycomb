import { requireDefined } from "@tests/helpers/require-defined";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({
  cwd: process.cwd(),
  overrideConfigFile: "eslint-config-next.ts",
});

async function lintConsoleAt(filePath: string) {
  const [result] = await eslint.lintText("console.log('test');\n", {
    filePath,
  });

  const messages = requireDefined(result).messages;
  expect(messages.filter((message) => message.fatal)).toEqual([]);
  return messages.filter((message) => message.ruleId === "no-console");
}

describe("console lint boundary", () => {
  it.each([
    "src/auth.ts",
    "src/instrumentation.ts",
    "src/env/server.ts",
    "src/app/api/trpc/[trpc]/route.ts",
    "src/packages/trpc/api/context.ts",
  ])(
    "forbids console usage in %s",
    async (filePath) => {
      await expect(lintConsoleAt(filePath)).resolves.toHaveLength(1);
    },
    30_000,
  );

  it.each([
    "src/packages/infrastructure/observability/adapters/console.ts",
    "src/packages/infrastructure/observability/adapters/console-metrics.ts",
  ])("allows console usage in %s", async (filePath) => {
    await expect(lintConsoleAt(filePath)).resolves.toHaveLength(0);
  }, 30_000);
});
