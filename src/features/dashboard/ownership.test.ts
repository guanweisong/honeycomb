// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard feature ownership", () => {
  it("owns statistics independently of site settings without old exports", () => {
    for (const path of ["server.ts", "router.ts", "admin/components/DashboardPageClient/index.tsx"]) {
      expect(existsSync(`src/features/dashboard/${path}`), path).toBe(true);
    }
    expect(existsSync("src/features/dashboard/admin/page.tsx")).toBe(false);
    expect(
      readFileSync("src/app/admin/(dashboard)/dashboard/page.tsx", "utf8"),
    ).toContain("@/features/dashboard/admin/components/DashboardPageClient");
    expect(existsSync("src/features/setting/statistic.router.ts")).toBe(false);
    expect(existsSync("src/features/setting/admin/dashboard")).toBe(false);
    expect(
      readFileSync("src/features/setting/server.ts", "utf8"),
    ).not.toContain("getStatistics");
    expect(readFileSync("src/features/setting/types.ts", "utf8")).not.toContain(
      "StatisticsType",
    );
    const rootRouter = readFileSync("src/app/_trpc/router.ts", "utf8");
    expect(rootRouter).toContain("@/features/dashboard/router");
    expect(rootRouter).toMatch(/statistic:\s*statisticRouter/);
  });
});
