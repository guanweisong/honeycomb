// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sourceFiles } from "@tests/helpers/source-files";

describe("dashboard feature ownership", () => {
  it("owns statistics independently of site settings without old exports", () => {
    for (const path of [
      "server/dashboard-queries.ts",
      "router.ts",
    ]) {
      expect(existsSync(`src/features/dashboard/${path}`), path).toBe(true);
    }
    expect(existsSync("src/features/dashboard/admin")).toBe(false);
    expect(
      readFileSync("src/app/admin/(dashboard)/dashboard/page.tsx", "utf8"),
    ).toContain("@/app/admin/(dashboard)/dashboard/components/DashboardPageClient");
    expect(existsSync("src/features/setting/statistic.router.ts")).toBe(false);
    expect(existsSync("src/app/admin/(dashboard)/setting/components/dashboard")).toBe(false);
    const settingSources = sourceFiles("src/features/setting")
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(settingSources).not.toContain("getStatistics");
    expect(settingSources).not.toContain("StatisticsType");
    expect(existsSync("src/features/dashboard/types")).toBe(false);
    expect(existsSync("src/features/dashboard/schemas")).toBe(false);
    const rootRouter = readFileSync("src/app/trpc/router.ts", "utf8");
    expect(rootRouter).toContain("@/features/dashboard/router");
    expect(rootRouter).toMatch(/statistic:\s*statisticRouter/);
  });
});
