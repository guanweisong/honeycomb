import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin client dependency boundaries", () => {
  it("keeps editor media dependencies out of the shared admin provider", () => {
    const source = readFileSync("src/app/admin/AdminProviders.tsx", "utf8");

    expect(source).not.toMatch(/PhotoPicker|MediaPageShell|TiptapMediaPicker/);
  });

  it.each([
    "src/app/admin/(root)/(dashboard)/post/edit/page.tsx",
    "src/app/admin/(root)/(dashboard)/page/edit/page.tsx",
  ])("provides editor media capability only at %s", (path) => {
    const source = readFileSync(path, "utf8");

    expect(source).toContain("EditorMediaProvider");
  });

  it("keeps charts and sortable trees route-local", () => {
    const dashboard = readFileSync(
      "src/app/admin/(root)/(dashboard)/dashboard/page.tsx",
      "utf8",
    );
    const menu = readFileSync("src/features/menu/admin/page.tsx", "utf8");

    expect(dashboard).toContain("DashboardPageClient");
    expect(menu).toContain("MenuPageShell");
    expect(readFileSync("src/app/admin/AdminProviders.tsx", "utf8")).not.toMatch(
      /DashboardPageClient|MenuPageShell/,
    );
  });
});
