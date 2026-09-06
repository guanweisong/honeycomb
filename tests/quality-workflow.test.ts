import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/quality.yml"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as { scripts: Record<string, string> };

describe("quality workflow", () => {
  it("uses the repository Bun version and lockfile installation", () => {
    expect(workflow).toContain("bun-version: 1.3.3");
    expect(workflow).toContain("bun install --frozen-lockfile");
  });

  it("keeps Turbopack analysis finite and writes static diagnostics", () => {
    expect(workflow).toContain("- run: bun run build");
    expect(workflow).toContain("- run: timeout 10m bun run analyze");
    expect(workflow).toContain("path: .next/diagnostics/analyze/");
    expect(packageJson.scripts.analyze).toBe(
      "bun next experimental-analyze --output",
    );
    expect(workflow).not.toMatch(/webpack/i);
  });

  it("keeps all blocking quality and security checks", () => {
    for (const command of [
      "bun run check-types",
      "bun run lint",
      "bun run test:unit:run",
      "bun run test:unit:coverage",
      "bun run test:unit:process",
      "bun run audit:production",
      "tests/e2e/security-headers.spec.ts",
      "tests/e2e/admin/rbac.spec.ts",
      "tests/e2e/blog/pwa-offline.spec.ts",
    ]) {
      expect(workflow).toContain(command);
    }
    expect(workflow).not.toContain("bun audit --audit-level=critical");
  });
});
