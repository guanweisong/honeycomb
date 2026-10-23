// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { loadProductionSources } from "./capability-authorization-sources";

it("loads current production bodies while excluding both spec and test sources", () => {
  const root = mkdtempSync(join(tmpdir(), "honeycomb-authorization-sources-"));
  const cwd = vi.spyOn(process, "cwd").mockReturnValue(root);
  try {
    mkdirSync(join(root, "src", ".hidden"), { recursive: true });
    for (const name of ["a.ts", "b.tsx", "a.test.ts", "b.spec.tsx", "notes.md"])
      writeFileSync(join(root, "src", name), name);
    writeFileSync(join(root, "src", ".hidden", "c.ts"), "hidden");
    expect(loadProductionSources()).toEqual([
      { fileName: "src/.hidden/c.ts", source: "hidden" },
      { fileName: "src/a.ts", source: "a.ts" },
      { fileName: "src/b.tsx", source: "b.tsx" },
    ]);
    writeFileSync(join(root, "src", "a.ts"), "updated");
    expect(
      loadProductionSources().find((file) => file.fileName === "src/a.ts")
        ?.source,
    ).toBe("updated");
  } finally {
    cwd.mockRestore();
    rmSync(root, { recursive: true });
  }
});
