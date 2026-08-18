import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/quality.yml"),
  "utf8",
);

describe("quality workflow", () => {
  it("uses the repository Bun version and lockfile installation", () => {
    expect(workflow).toContain("bun-version: 1.3.3");
    expect(workflow).toContain("bun install --frozen-lockfile");
  });

  it("keeps Turbopack as the production build path", () => {
    expect(workflow).toContain("- run: bun run build");
    expect(workflow).toContain("- run: bun run analyze");
    expect(workflow).not.toMatch(/webpack/i);
  });

  it("keeps all blocking quality and security checks", () => {
    for (const command of [
      "bun run check-types",
      "bun run lint",
      "bun run test:unit:run",
      "bun run test:unit:coverage",
      "bun run test:unit:process",
      "bun audit --audit-level=critical",
      "tests/e2e/security-headers.spec.ts",
      "tests/e2e/admin/rbac.spec.ts",
      "tests/e2e/blog/pwa-offline.spec.ts",
    ]) {
      expect(workflow).toContain(command);
    }
  });
});
