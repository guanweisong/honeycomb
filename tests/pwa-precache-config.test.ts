import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getManifest } from "@serwist/build";
import {
  offlinePrecacheUrl,
  pwaGlobIgnores,
} from "@/packages/infrastructure/pwa/precache-config";

let fixture = "";

afterEach(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

describe("PWA precache configuration", () => {
  it("excludes screenshots, source maps and admin route assets", async () => {
    fixture = mkdtempSync(join(tmpdir(), "honeycomb-precache-"));
    const files = [
      "public/static/images/desktop.png",
      "public/static/images/mobile.png",
      "public/static/images/logo.png",
      ".next/static/app/admin/dashboard.js",
      ".next/static/chunks/public.js",
      ".next/static/chunks/public.js.map",
    ];
    for (const file of files) {
      mkdirSync(join(fixture, file, ".."), { recursive: true });
      writeFileSync(join(fixture, file), file);
    }

    const result = await getManifest({
      globDirectory: fixture,
      globPatterns: ["public/**/*", ".next/**/*"],
      globIgnores: [...pwaGlobIgnores],
      additionalPrecacheEntries: [{ url: offlinePrecacheUrl, revision: "test" }],
    });
    const urls = result.manifestEntries?.map((entry) => entry.url) ?? [];

    expect(urls).toContain("public/static/images/logo.png");
    expect(urls).toContain(".next/static/chunks/public.js");
    expect(urls).toContain(offlinePrecacheUrl);
    expect(urls).not.toContain("public/static/images/desktop.png");
    expect(urls).not.toContain("public/static/images/mobile.png");
    expect(urls).not.toContain(".next/static/app/admin/dashboard.js");
    expect(urls).not.toContain(".next/static/chunks/public.js.map");
  });
});
