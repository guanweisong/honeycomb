import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import type { SettingRecord } from "../../../types";
const mocks = vi.hoisted(() => ({
  setting: undefined as SettingRecord | undefined,
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => true,
  useCurrentUser: () => ({ user: { id: "actor" } }),
}));
vi.mock("@/features/setting/admin/use-site-setting", () => ({
  useSiteSetting: () => ({ setting: mocks.setting, refreshSetting: vi.fn() }),
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    setting: { update: { useMutation: () => ({ mutateAsync: vi.fn() }) } },
  },
}));
vi.mock("@/components/editor", () => ({ default: () => null }));
import SettingClient from "./index";
const initial: SettingRecord = {
  id: "111111111111111111111111",
  version: 0,
  siteName: { en: "Honeycomb E2E", zh: "蜂巢 E2E" },
  siteSubName: null,
  siteSignature: null,
  siteCopyright: null,
  siteRecordNo: null,
  siteRecordUrl: null,
  createdAt: null,
  updatedAt: null,
};
describe("SettingClient real field initialization", () => {
  it.each([false, true])(
    "shows server values with delayed loading %s",
    async (delayed) => {
      mocks.setting = delayed ? undefined : initial;
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);
      try {
        await act(async () =>
          root.render(
            <React.StrictMode>
              <SettingClient />
            </React.StrictMode>,
          ),
        );
        if (delayed) {
          expect(container.querySelector("form")).toBeNull();
          expect(container.textContent).toContain("设置尚未加载");
          mocks.setting = initial;
          await act(async () =>
            root.render(
              <React.StrictMode>
                <SettingClient />
              </React.StrictMode>,
            ),
          );
        }
        expect(
          container.querySelector<HTMLInputElement>(
            'input[placeholder="请填写站点名称"]',
          )?.value,
        ).toBe("蜂巢 E2E");
        expect(container.textContent).toContain("已与服务器同步");
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    },
  );
});
