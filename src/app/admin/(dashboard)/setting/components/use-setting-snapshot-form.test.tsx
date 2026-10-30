import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { useSettingSnapshotForm } from "@/app/admin/(dashboard)/setting/components/use-setting-snapshot-form";
import type { SettingRecord } from "@/features/setting/types/setting.record";

const setting: SettingRecord = {
  id: "111111111111111111111111",
  version: 0,
  siteName: { zh: "原始", en: "Original" },
  siteSubName: null,
  siteSignature: null,
  siteCopyright: null,
  siteRecordNo: null,
  siteRecordUrl: null,
  createdAt: null,
  updatedAt: null,
};
describe("setting snapshot form", () => {
  it("protects reverted-to-baseline input while save or review is pending", async () => {
    const root = createRoot(document.createElement("div"));
    let editor: ReturnType<typeof useSettingSnapshotForm> | undefined;
    const current = () => {
      if (!editor) throw new Error("not mounted");
      return editor;
    };
    function Probe({
      remote,
      protectedSnapshot,
    }: {
      remote: SettingRecord;
      protectedSnapshot: boolean;
    }) {
      editor = useSettingSnapshotForm(remote, protectedSnapshot);
      return null;
    }
    try {
      await act(async () =>
        root.render(<Probe remote={setting} protectedSnapshot={false} />),
      );
      await act(async () =>
        current().form.setValue("siteName.zh", "提交", { shouldDirty: true }),
      );
      const submitted = structuredClone(current().form.getValues());
      await act(async () =>
        root.render(<Probe remote={setting} protectedSnapshot={true} />),
      );
      await act(async () =>
        current().form.setValue("siteName.zh", "原始", { shouldDirty: true }),
      );
      expect(current().form.formState.isDirty).toBe(false);
      await act(async () =>
        root.render(
          <Probe
            remote={{
              ...setting,
              version: 1,
              siteName: { zh: "提交", en: "Original" },
            }}
            protectedSnapshot={true}
          />,
        ),
      );
      expect(current().form.getValues("siteName.zh")).toBe("原始");
      await act(async () => current().acknowledge(submitted, 1));
      expect(current().form.formState.isDirty).toBe(true);
    } finally {
      await act(async () => root.unmount());
    }
  });
  it("retains dirty input through refresh and post-submit newer typing", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    let editor: ReturnType<typeof useSettingSnapshotForm> | undefined;
    const current = () => {
      if (!editor) throw new Error("not mounted");
      return editor;
    };
    function Probe({ remote }: { remote: SettingRecord }) {
      editor = useSettingSnapshotForm(remote);
      return null;
    }
    try {
      await act(async () => root.render(<Probe remote={setting} />));
      await act(async () =>
        current().form.setValue("siteName.zh", "本地", { shouldDirty: true }),
      );
      const submitted = structuredClone(current().form.getValues());
      await act(async () =>
        root.render(
          <Probe
            remote={{
              ...setting,
              version: 1,
              siteName: { zh: "远程", en: "Remote" },
            }}
          />,
        ),
      );
      expect(current().form.getValues("siteName.zh")).toBe("本地");
      expect(current().form.getValues("expectedVersion")).toBe(0);
      await act(async () =>
        current().form.setValue("siteName.zh", "更新输入", {
          shouldDirty: true,
        }),
      );
      await act(async () => current().acknowledge(submitted, 1));
      expect(current().form.getValues("siteName.zh")).toBe("更新输入");
      expect(current().form.getValues("expectedVersion")).toBe(1);
      expect(current().form.formState.isDirty).toBe(true);
    } finally {
      await act(async () => root.unmount());
    }
  });
});
