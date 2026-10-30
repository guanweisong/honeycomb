import React, { act } from "react";
import { z } from "zod";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingRecord } from "@/features/setting/types/setting.record";
const initial: SettingRecord = {
  id: "111111111111111111111111",
  version: 0,
  siteName: { en: "Honeycomb", zh: "蜂巢" },
  siteSubName: null,
  siteSignature: null,
  siteCopyright: null,
  siteRecordNo: null,
  siteRecordUrl: null,
  createdAt: null,
  updatedAt: null,
};
const mocks = vi.hoisted(() => ({
  setting: undefined as SettingRecord | undefined,
  actorId: "actor",
  setTitle: (value: string) => {
    void value;
  },
  getTitle: () => "",
  update: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock("@/app/admin/(dashboard)/providers/use-current-user", () => ({
  useCan: () => true,
  useCurrentUser: () => ({ user: { id: mocks.actorId } }),
}));
vi.mock("@/app/admin/(dashboard)/providers/use-site-setting", () => ({
  useSiteSetting: () => ({
    setting: mocks.setting,
    refreshSetting: mocks.refetch,
  }),
}));
vi.mock("@/components/DynamicForm/DynamicField", async () => {
  const { useFormContext } = await import("react-hook-form");
  return {
    DynamicField: () => {
      const form = useFormContext();
      mocks.setTitle = (value: string) =>
        form.setValue("siteName.zh", value, { shouldDirty: true });
      mocks.getTitle = () => form.getValues("siteName.zh");
      return null;
    },
  };
});
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    setting: { update: { useMutation: () => ({ mutateAsync: mocks.update }) } },
  },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error, warning: mocks.warning },
}));
import SettingClient from "@/app/admin/(dashboard)/setting/components/SettingClient/index";

describe("SettingClient", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(async () => {
    mocks.setting = initial;
    mocks.actorId = "actor";
    mocks.update.mockReset();
    mocks.error.mockReset();
    mocks.success.mockReset();
    mocks.warning.mockReset();
    mocks.refetch.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<SettingClient />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  const submit = (container: HTMLElement) =>
    container
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  it("hides passive sync copy while retaining dirty save gating", async () => {
    const save = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(save?.disabled).toBe(true);
    expect(container.textContent).not.toMatch(/已与服务器同步|有未保存的更改/);
    await act(async () => mocks.setTitle("本地"));
    expect(save?.disabled).toBe(false);
    expect(container.textContent).not.toMatch(/已与服务器同步|有未保存的更改/);
    await act(async () => mocks.setTitle("蜂巢"));
    expect(save?.disabled).toBe(true);
  });
  it("uses loaded defaults and preserves edits after background data changes", async () => {
    expect(mocks.getTitle()).toBe("蜂巢");
    await act(async () => mocks.setTitle("本地"));
    mocks.setting = {
      ...initial,
      version: 1,
      siteName: { en: "Remote", zh: "远程" },
    };
    await act(async () => root.render(<SettingClient />));
    expect(mocks.getTitle()).toBe("本地");
  });
  it("does not save when the setting has not loaded", async () => {
    mocks.setting = undefined;
    mocks.actorId = "new";
    await act(async () => root.render(<SettingClient />));
    await act(async () => submit(container));
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(["completed", "degraded"])(
    "keeps committed %s writes separate from refresh failure",
    async (publicSync) => {
      mocks.update.mockResolvedValue({ ...initial, version: 1, publicSync });
      mocks.refetch.mockRejectedValue(new Error("refresh"));
      await act(async () => mocks.setTitle("本地"));
      await act(async () => submit(container));
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedVersion: 0,
          siteName: { zh: "本地", en: "Honeycomb" },
        }),
      );
      expect(mocks.error).not.toHaveBeenCalled();
      expect(mocks.warning).toHaveBeenCalledWith(
        "已保存，设置待刷新，请勿重复提交",
      );
    },
  );
  it.each([
    { data: { code: "CONFLICT" } },
    new Error("network"),
    new z.ZodError([]),
  ])(
    "blocks replay and retains input after conflict/unknown",
    async (error) => {
      mocks.update.mockRejectedValue(error);
      await act(async () => mocks.setTitle("本地"));
      await act(async () => submit(container));
      expect(mocks.getTitle()).toBe("本地");
      expect(container.textContent).toContain("读取最新设置供核对");
      await act(async () => submit(container));
      expect(mocks.update).toHaveBeenCalledOnce();
    },
  );
  it.each(["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED", "NOT_FOUND"])(
    "keeps input editable after determinate %s rejection",
    async (code) => {
      mocks.update.mockRejectedValue({ data: { code } });
      await act(async () => mocks.setTitle("本地"));
      await act(async () => submit(container));
      expect(mocks.getTitle()).toBe("本地");
      expect(container.textContent).not.toContain("读取最新设置供核对");
      expect(mocks.error).toHaveBeenCalledWith("更新失败，请检查输入和权限");
      await act(async () => submit(container));
      expect(mocks.update).toHaveBeenCalledTimes(2);
    },
  );
  it("keeps a revert-to-baseline edit when committed query data arrives before the response", async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.update.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await act(async () => mocks.setTitle("提交"));
    await act(async () => submit(container));
    await act(async () => mocks.setTitle("蜂巢"));
    mocks.setting = {
      ...initial,
      version: 1,
      siteName: { zh: "提交", en: "Honeycomb" },
    };
    await act(async () => root.render(<SettingClient />));
    expect(mocks.getTitle()).toBe("蜂巢");
    mocks.refetch.mockResolvedValue(mocks.setting);
    await act(async () =>
      resolve?.({ ...mocks.setting, publicSync: "completed" }),
    );
    expect(mocks.getTitle()).toBe("蜂巢");
    expect(
      container.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(false);
    expect(container.textContent).not.toMatch(/已与服务器同步|有未保存的更改/);
  });
  it("preserves newer typing while a write is pending", async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.update.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    mocks.refetch.mockResolvedValue({ ...initial, version: 1 });
    await act(async () => mocks.setTitle("已提交"));
    await act(async () => submit(container));
    await act(async () => mocks.setTitle("更新输入"));
    await act(async () =>
      resolve?.({ ...initial, version: 1, publicSync: "completed" }),
    );
    expect(mocks.getTitle()).toBe("更新输入");
    expect(
      container.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(false);
    expect(container.textContent).not.toMatch(/已与服务器同步|有未保存的更改/);
  });
  it("ignores old responses after switching account", async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.update.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await act(async () => mocks.setTitle("旧账户"));
    await act(async () => submit(container));
    mocks.actorId = "other";
    await act(async () => root.render(<SettingClient />));
    await act(async () =>
      resolve?.({ ...initial, version: 1, publicSync: "completed" }),
    );
    expect(mocks.getTitle()).toBe("蜂巢");
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
