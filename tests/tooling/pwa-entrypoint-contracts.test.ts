import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { offlinePrecacheUrl } from "@/lib/pwa/precache-config";

describe("web app manifest", () => {
  it("loads public settings at request time", async () => {
    const source = await readFile(
      join(
        process.cwd(),
        "src/app/(blog)/[locale]/manifest.webmanifest/route.ts",
      ),
      "utf8",
    );

    expect(source).toContain("await connection()");
    expect(source).toContain("await getPublicSetting()");
    expect(source).not.toContain("@/app/trpc/server");
    expect(source).not.toContain("createServerClient");
  });
});

describe("PWA 离线可靠性", () => {
  it("从应用私有目录构建唯一 worker，保持公开输出路径", async () => {
    const source = await readFile(
      join(process.cwd(), "scripts/build-serwist.ts"),
      "utf8",
    );
    expect(source).toContain('entrypoints: ["src/app/pwa/sw.ts"]');
    expect(source).toContain('resolve("public/serwist/sw.js")');
  });

  it("显式预缓存与导航 fallback 使用同一个离线页面", async () => {
    const buildSource = await readFile(
      join(process.cwd(), "scripts/build-serwist.ts"),
      "utf8",
    );
    const workerSource = await readFile(
      join(process.cwd(), "src/app/pwa/sw.ts"),
      "utf8",
    );
    const providerSource = await readFile(
      join(process.cwd(), "src/app/(blog)/BlogProviders.tsx"),
      "utf8",
    );

    expect(buildSource).toContain("injectManifest");
    expect(buildSource).toContain("offlinePrecacheUrl");
    expect(workerSource).toContain(
      `const offlineFallbackUrl = "${offlinePrecacheUrl}"`,
    );
    expect(workerSource).toContain("serwist.matchPrecache(offlineFallbackUrl)");
    expect(providerSource).toContain(
      'register("/serwist/sw.js", { scope: "/" })',
    );
  });

  it("public 不得保留旧 Service Worker 与 Workbox 资产", async () => {
    const legacyAssets = (await readdir(join(process.cwd(), "public"))).filter(
      (entry) =>
        entry === "sw.js" ||
        entry === "sw.js.map" ||
        entry.startsWith("workbox-"),
    );

    expect(legacyAssets).toEqual([]);
  });
});
