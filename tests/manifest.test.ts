import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { offlinePrecacheUrl } from "@/packages/infrastructure/pwa/precache-config";

describe("web app manifest", () => {
  it("does not import runtime services", async () => {
    const source = await readFile(
      join(process.cwd(), "src/app/manifest.ts"),
      "utf8",
    );

    expect(source).not.toContain("@/packages/trpc/api");
    expect(source).not.toContain("createServerClient");
  });
});

describe("PWA 离线可靠性", () => {
  it("显式预缓存与导航 fallback 使用同一个离线页面", async () => {
    const routeSource = await readFile(
      join(process.cwd(), "src/app/serwist/[path]/route.ts"),
      "utf8",
    );
    const workerSource = await readFile(
      join(process.cwd(), "src/app/sw.ts"),
      "utf8",
    );

    expect(routeSource).toMatch(
      /additionalPrecacheEntries:[\s\S]*url:\s*offlinePrecacheUrl[\s\S]*revision:/,
    );
    expect(workerSource).toContain(
      `const offlineFallbackUrl = "${offlinePrecacheUrl}"`,
    );
    expect(workerSource).toContain("serwist.matchPrecache(offlineFallbackUrl)");
  });

  it("public 不得保留旧 Service Worker 与 Workbox 资产", async () => {
    const legacyAssets = (await readdir(join(process.cwd(), "public")))
      .filter((entry) => entry === "sw.js" || entry === "sw.js.map" || entry.startsWith("workbox-"));

    expect(legacyAssets).toEqual([]);
  });
});
