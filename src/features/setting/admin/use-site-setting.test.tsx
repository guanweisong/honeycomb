import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    setting: { index: { useQuery: () => ({ data: undefined }) } },
    useUtils: () => ({ setting: { index: { fetch: mocks.fetch } } }),
  },
}));
import { SiteSettingProvider, useSiteSetting } from "./use-site-setting";
it("explicit review forces a fresh server fetch rather than reusing a fresh cached snapshot", async () => {
  const root = createRoot(document.createElement("div"));
  let refresh: (() => Promise<unknown>) | undefined;
  function Consumer() {
    refresh = useSiteSetting().refreshSetting;
    return null;
  }
  try {
    await act(async () =>
      root.render(
        <SiteSettingProvider>
          <Consumer />
        </SiteSettingProvider>,
      ),
    );
    await act(async () => {
      await refresh?.();
    });
    expect(mocks.fetch).toHaveBeenCalledWith(undefined, { staleTime: 0 });
  } finally {
    await act(async () => root.unmount());
  }
});
