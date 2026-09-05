import { resolve } from "node:path";
import { ESLint } from "eslint";
import { expect, it } from "vitest";

it("类型感知Lint拒绝隐式any跨越赋值、调用、属性和返回边界", async () => {
  const eslint = new ESLint({
    overrideConfigFile: resolve("eslint-config-next.ts"),
  });
  const results = await eslint.lintText(
    `
    declare const external: any;
    declare function accept(value: string): void;
    export const assigned: string = external;
    export const member: string = external.name;
    external();
    accept(external);
    export function returned(): string { return external; }
  `,
    { filePath: resolve("src/packages/application/use-case.ts") },
  );
  const ruleIds = results.flatMap((result) =>
    result.messages.map((message) => message.ruleId),
  );
  for (const rule of [
    "assignment",
    "return",
    "call",
    "member-access",
    "argument",
  ]) {
    expect(ruleIds).toContain(`@typescript-eslint/no-unsafe-${rule}`);
  }
}, 30_000);
