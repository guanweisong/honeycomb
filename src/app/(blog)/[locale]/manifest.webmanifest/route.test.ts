// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { setting, connection } = vi.hoisted(() => ({
  setting: vi.fn(),
  connection: vi.fn(),
}));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/app/lib/server/public-queries", () => ({
  getPublicSetting: setting,
}));
import { GET } from "@/app/(blog)/[locale]/manifest.webmanifest/route";

const getManifest = (locale: string) =>
  GET(new Request(`http://localhost/${locale}/manifest.webmanifest`), {
    params: Promise.resolve({ locale }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  setting.mockResolvedValue({
    siteName: { en: "English site", zh: "中文站点" },
    siteSubName: { en: "English description", zh: "中文描述" },
  });
});

describe("localized manifest route", () => {
  it.each([
    ["en", "English site", "English description"],
    ["zh", "中文站点", "中文描述"],
  ])(
    "returns actual %s JSON and install start URL",
    async (locale, name, description) => {
      const response = await getManifest(locale);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "application/manifest+json; charset=utf-8",
      );
      expect(await response.json()).toMatchObject({
        name,
        short_name: name,
        description,
        start_url: `/${locale}/`,
        display: "standalone",
        icons: expect.arrayContaining([
          expect.objectContaining({
            src: "/static/images/logo.192.png",
            sizes: "192x192",
            purpose: "maskable",
          }),
        ]),
      });
      expect(connection).toHaveBeenCalledOnce();
    },
  );

  it("normalizes unsupported locales without leaking them into start_url", async () => {
    const response = await getManifest("unsupported");
    expect(await response.json()).toMatchObject({
      name: "English site",
      start_url: "/en/",
    });
  });

  it.each([
    undefined,
    {},
    { siteName: { zh: "只有中文" }, siteSubName: { zh: "只有中文" } },
  ])(
    "returns stable fallbacks when localized settings are missing: %j",
    async (value) => {
      setting.mockResolvedValue(value);
      expect(await (await getManifest("en")).json()).toMatchObject({
        name: "Honeycomb",
        short_name: "Honeycomb",
        description: "Honeycomb content management system",
        start_url: "/en/",
      });
    },
  );

  it("does not disguise a settings failure as a successful default manifest", async () => {
    const failure = new Error("settings unavailable");
    setting.mockRejectedValue(failure);
    await expect(getManifest("en")).rejects.toBe(failure);
  });
});
