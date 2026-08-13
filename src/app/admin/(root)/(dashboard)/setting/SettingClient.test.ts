import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { SettingEntity } from "@/packages/trpc/api/outputs";

vi.mock("@/app/admin/hooks/useCurrentUser", () => ({ useCan: () => true }));
vi.mock("@/app/admin/hooks/useSiteSetting", () => ({
  useSiteSetting: () => ({ setting: undefined, refreshSetting: vi.fn() }),
}));
vi.mock("@/packages/ui/extended/DynamicForm", () => ({
  DynamicForm: ({ defaultValues }: { defaultValues?: { id?: string } }) =>
    React.createElement("div", { "data-setting-id": defaultValues?.id }),
}));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({ setting: { index: { invalidate: vi.fn() } } }),
    setting: { update: { useMutation: () => ({ mutateAsync: vi.fn() }) } },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SettingClient from "./SettingClient";

describe("SettingClient", () => {
  it("uses the server-provided setting as form defaults", () => {
    const element = SettingClient({
      setting: { id: "setting-1", siteName: { en: "Honeycomb", zh: "Honeycomb" } } as SettingEntity,
    });

    expect(element.props.children.props.defaultValues.id).toBe("setting-1");
  });
});
