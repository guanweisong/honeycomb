import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/contracts/admin/use-current-user", () => ({ useCan: () => true }));
vi.mock("@/features/setting/admin/hooks-use-site-setting", () => ({
  useSiteSetting: () => ({
    setting: { id: "setting-1", siteName: { en: "Honeycomb", zh: "Honeycomb" } },
    refreshSetting: vi.fn(),
  }),
}));
vi.mock("@/packages/ui/extended/DynamicForm", () => ({
  DynamicForm: ({ defaultValues, ...props }: { defaultValues?: { id?: string }; key?: string }) =>
    React.createElement("div", {
      "data-setting-id": defaultValues?.id,
      "data-form-key": props.key,
    }),
}));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({ setting: { index: { invalidate: vi.fn() } } }),
    setting: { update: { useMutation: () => ({ mutateAsync: vi.fn() }) } },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SettingClient from "./index";

describe("SettingClient", () => {
  it("uses the server-provided setting as form defaults", () => {
    const element = SettingClient();

    expect(element.props.children.props.defaultValues.id).toBe("setting-1");
  });
});
