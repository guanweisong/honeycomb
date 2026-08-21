import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setting: {
    siteSignature: { zh: "站点签名" },
    siteCopyright: { zh: "保留所有权利" },
    siteRecordNo: "京ICP备00000000号",
    siteRecordUrl: "https://beian.miit.gov.cn/",
  } as {
    siteSignature: { zh: string };
    siteCopyright: { zh: string };
    siteRecordNo?: string;
    siteRecordUrl?: string;
  },
}));

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "zh"),
}));

vi.mock("@/app/lib/server/site-setting", () => ({
  getSiteSetting: vi.fn(async () => mocks.setting),
}));

import Footer from ".";

describe("Footer", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.setting = {
      siteSignature: { zh: "站点签名" },
      siteCopyright: { zh: "保留所有权利" },
      siteRecordNo: "京ICP备00000000号",
      siteRecordUrl: "https://beian.miit.gov.cn/",
    };
  });

  const render = async () => {
    const element = await Footer();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(element));
  };

  it("renders localized signature, copyright year, and record link", async () => {
    await render();

    expect(container.querySelector("footer")?.textContent).toContain(
      "站点签名",
    );
    expect(container.querySelector("footer")?.textContent).toContain(
      `${new Date().getFullYear()}`,
    );
    expect(container.querySelector("footer")?.textContent).toContain(
      "保留所有权利",
    );
    const recordLink = container.querySelector(
      'a[aria-label="View site record: 京ICP备00000000号"]',
    );
    expect(recordLink?.getAttribute("href")).toBe("https://beian.miit.gov.cn/");
    expect(recordLink?.getAttribute("target")).toBe("_blank");
  });

  it("renders the record number as text when no record URL exists", async () => {
    mocks.setting = { ...mocks.setting, siteRecordUrl: undefined };
    await render();

    expect(container.textContent).toContain("京ICP备00000000号");
    expect(
      container.querySelector('a[aria-label^="View site record"]'),
    ).toBeNull();
  });

  it("does not render a record placeholder when no record number exists", async () => {
    mocks.setting = {
      ...mocks.setting,
      siteRecordNo: undefined,
      siteRecordUrl: undefined,
    };
    await render();

    expect(container.querySelector("footer")?.textContent).not.toContain(
      "备案",
    );
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });
});
