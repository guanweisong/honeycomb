import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setting: {
    id: "setting-1",
    siteName: { en: "Honeycomb", zh: "Honeycomb" },
  } as { id: string; siteName: { en: string; zh: string } } | undefined,
  submit: undefined as
    ((values: Record<string, unknown>) => Promise<void>) | undefined,
  update: vi.fn().mockResolvedValue(undefined),
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/packages/ui/admin/use-current-user", () => ({ useCan: () => true }));
vi.mock("@/features/setting/admin/hooks-use-site-setting", () => ({
  useSiteSetting: () => ({
    setting: mocks.setting,
    refreshSetting: mocks.refetch,
  }),
}));
vi.mock("@/packages/ui/extended/DynamicForm", () => ({
  DynamicForm: ({
    defaultValues,
    onSubmit,
    ...props
  }: {
    defaultValues?: { id?: string };
    onSubmit: (values: Record<string, unknown>) => Promise<void>;
    key?: string;
  }) => {
    mocks.submit = onSubmit;
    return React.createElement("div", {
      "data-setting-id": defaultValues?.id,
      "data-form-key": props.key,
    });
  },
}));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({ setting: { index: { invalidate: vi.fn() } } }),
    setting: { update: { useMutation: () => ({ mutateAsync: mocks.update }) } },
  },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error, warning: mocks.warning },
}));

import SettingClient from "./index";

describe("SettingClient", () => {
  beforeEach(() => {
    mocks.setting = {
      id: "setting-1",
      siteName: { en: "Honeycomb", zh: "Honeycomb" },
    };
    mocks.submit = undefined;
    mocks.update.mockClear();
    mocks.error.mockClear();
    mocks.success.mockReset();
    mocks.warning.mockReset();
    mocks.refetch.mockReset();
  });

  it("uses the server-provided setting as form defaults", () => {
    const element = SettingClient();

    expect(element.props.children.props.defaultValues.id).toBe("setting-1");
  });

  it("rejects submission while the setting record is unavailable", async () => {
    mocks.setting = undefined;
    const element = SettingClient();
    element.props.children.type(element.props.children.props);

    await mocks.submit?.({ siteName: { zh: "站点" } });

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("设置尚未加载，无法更新");
  });
  it.each(["completed", "degraded"])(
    "keeps a %s settings write successful if refresh rejects",
    async (publicSync) => {
      mocks.update.mockResolvedValue({ publicSync });
      mocks.refetch.mockRejectedValue(new Error("refresh failed"));
      const element = SettingClient();
      element.props.children.type(element.props.children.props);
      await mocks.submit?.({ siteName: { zh: "站点" } });
      expect(mocks.error).not.toHaveBeenCalled();
      if (publicSync === "degraded") {
        expect(mocks.warning).toHaveBeenCalledExactlyOnceWith(
          "已保存，公开内容同步未完成，请稍后检查公开页面",
        );
        expect(mocks.success).not.toHaveBeenCalled();
      } else {
        expect(mocks.success).toHaveBeenCalledExactlyOnceWith("更新成功");
        expect(mocks.warning).not.toHaveBeenCalled();
      }
    },
  );
});
