// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("keeps the editor lifecycle guard without redundant non-null toolbar checks", () => {
  const source = readFileSync("src/components/Editor/index.tsx", "utf8");
  expect(source).toContain("if (!editor) return null");
  const toolbar = source.slice(source.indexOf("function EditorToolbar"));
  expect(toolbar).not.toMatch(/editor\s*&&|&&\s*editor/);
});
