import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("DashboardPageClient boundary", () => {
  it("keeps the tRPC query in the client shell", () => {
    const source = readFileSync(
      resolve("src/app/admin/(root)/(dashboard)/dashboard/components/DashboardPageClient/index.tsx"),
      "utf8",
    );
    expect(source).toContain('"use client"');
    expect(source).toContain("trpc.statistic.index.useQuery");
  });
});
