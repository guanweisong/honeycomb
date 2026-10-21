// @vitest-environment node

import { requireDefined } from "@tests/helpers/require-defined";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const eslint = new ESLint({
  cwd: process.cwd(),
  overrideConfigFile: "eslint.config.ts",
});

async function lintConsoleAt(filePath: string) {
  const [result] = await eslint.lintText("console.log('test');\n", {
    filePath,
  });

  const messages = requireDefined(result).messages;
  expect(messages.filter((message) => message.fatal)).toEqual([]);
  return messages.filter((message) => message.ruleId === "no-console");
}

// Building the typed project is setup, not a console-policy assertion.
// CI observed 32–36s cold starts; keep a bounded 60s setup budget while each
// actual rule assertion retains its existing 30s deadline.
beforeAll(async () => {
  await eslint.lintText("export {};", { filePath: "src/auth.ts" });
}, 60_000);

describe("console lint boundary", () => {
  it.each([
    "src/auth.ts",
    "src/instrumentation.ts",
    "src/env/server.ts",
    "src/app/api/trpc/[trpc]/route.ts",
    "src/lib/trpc/context.ts",
  ])(
    "forbids console usage in %s",
    async (filePath) => {
      await expect(lintConsoleAt(filePath)).resolves.toHaveLength(1);
    },
    30_000,
  );

  it.each([
    "src/lib/observability/adapters/console.ts",
    "src/lib/observability/adapters/console-metrics.ts",
  ])(
    "allows console usage in %s",
    async (filePath) => {
      await expect(lintConsoleAt(filePath)).resolves.toHaveLength(0);
    },
    30_000,
  );
});
