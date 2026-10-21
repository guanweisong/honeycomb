// @vitest-environment node
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
const css = postcss.parse(readFileSync("src/app/styles/globals.css", "utf8"));
describe("editor task-list theme tokens", () => {
  it("uses complete CSS colors directly for checkbox accent and checked text", () => {
    const values: string[] = [];
    css.walkDecls(/^(accent-color|color)$/, (declaration) => {
      if (
        declaration.value.includes("--primary") ||
        declaration.value.includes("--muted-foreground")
      )
        values.push(declaration.value);
    });
    expect(values).toContain("var(--primary)");
    expect(values).toContain("var(--muted-foreground)");
    expect(values.some((value) => value.startsWith("hsl(var("))).toBe(false);
    const checked: string[] = [];
    css.walkRules(
      '.prose-editor ul[data-type="taskList"] li[data-checked="true"] > div',
      (rule) => {
        checked.push(rule.toString());
      },
    );
    expect(checked).toHaveLength(1);
    expect(checked[0]).toContain("line-through");
  });
});
