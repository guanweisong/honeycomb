import { describe, expect, it, vi } from "vitest";
import { ModalType } from "./modal-type";
import {
  closeAdminDialog,
  createInitialAdminDialogState,
  openAddAdminDialog,
  openEditAdminDialog,
  notifyPublicSyncWarning,
  runAdminMutation,
  submitAdminBatchDelete,
  withAdminRecordId,
} from "./action-state";

describe("admin action state", () => {
  it("constructs add, edit, and closed dialog states", () => {
    const record = { id: "record-1" };

    expect(createInitialAdminDialogState()).toEqual({
      type: ModalType.ADD,
      open: false,
    });
    expect(openAddAdminDialog()).toEqual({
      type: ModalType.ADD,
      open: true,
      record: undefined,
    });
    expect(openEditAdminDialog(record)).toEqual({
      type: ModalType.EDIT,
      open: true,
      record,
    });
    expect(closeAdminDialog()).toEqual({ open: false });
  });

  it("uses the selected record id instead of a submitted id", () => {
    expect(
      withAdminRecordId({ id: "record-1" }, { id: "forged", name: "Name" }),
    ).toEqual({ id: "record-1", name: "Name" });
  });

  it("deletes selected ids and clears selection only after success", async () => {
    const deleteItems = vi.fn().mockResolvedValue("success");
    const onSelectionChange = vi.fn();

    await submitAdminBatchDelete({
      selectedRows: [{ id: "record-1" }, { id: "record-2" }],
      deleteItems,
      onSelectionChange,
    });

    expect(deleteItems).toHaveBeenCalledWith(["record-1", "record-2"]);
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it.each(["error", "noop"] as const)(
    "retains selected rows after %s",
    async (state) => {
      const onSelectionChange = vi.fn();
      await expect(
        submitAdminBatchDelete({
          selectedRows: [{ id: "record-1" }],
          deleteItems: async () => state,
          onSelectionChange,
        }),
      ).resolves.toBe(false);
      expect(onSelectionChange).not.toHaveBeenCalled();
    },
  );

  it("runs mutation feedback only for successful results", async () => {
    const refetch = vi.fn();
    const notifySuccess = vi.fn();

    await expect(
      runAdminMutation({
        input: { id: "record-1" },
        mutate: async () => ({ success: true }),
        isSuccess: (result) => result.success,
        refetch,
        notifySuccess,
        notifyError: vi.fn(),
        successMessage: "保存成功",
        errorMessage: "保存失败",
      }),
    ).resolves.toBe("success");
    expect(refetch).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith("保存成功");

    refetch.mockClear();
    notifySuccess.mockClear();
    await expect(
      runAdminMutation({
        input: { id: "record-1" },
        mutate: async () => ({ success: false }),
        isSuccess: (result) => result.success,
        refetch,
        notifySuccess,
        notifyError: vi.fn(),
        successMessage: "保存成功",
        errorMessage: "保存失败",
      }),
    ).resolves.toBe("noop");
    expect(refetch).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it("reports mutation failures without refreshing", async () => {
    const refetch = vi.fn();
    const notifyError = vi.fn();

    await expect(
      runAdminMutation({
        input: { id: "record-1" },
        mutate: vi.fn().mockRejectedValue(new Error("network")),
        refetch,
        notifySuccess: vi.fn(),
        notifyError,
        successMessage: "保存成功",
        errorMessage: "保存失败",
      }),
    ).resolves.toBe("error");
    expect(refetch).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith("保存失败");
  });
});

describe("public sync feedback", () => {
  it("warns only for an explicit degraded result", () => {
    const warning = vi.fn();
    for (const result of [undefined, null, true, { publicSync: "completed" }]) {
      expect(notifyPublicSyncWarning(result, warning)).toBe(false);
    }
    expect(warning).not.toHaveBeenCalled();
    expect(notifyPublicSyncWarning({ publicSync: "degraded" }, warning)).toBe(
      true,
    );
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      "已保存，公开内容同步未完成，请稍后检查公开页面",
    );
  });

  it.each(["completed", "degraded"])(
    "keeps %s committed writes successful when refresh throws or rejects",
    async (publicSync) => {
      for (const refetch of [
        () => {
          throw new Error("refresh");
        },
        () => Promise.reject(new Error("refresh")),
      ]) {
        const notifySuccess = vi.fn();
        const notifyWarning = vi.fn();
        const notifyError = vi.fn();
        await expect(
          runAdminMutation({
            input: undefined,
            mutate: async () => ({ publicSync }),
            refetch,
            notifySuccess,
            notifyWarning,
            notifyError,
            successMessage: "保存成功",
            errorMessage: "保存失败",
          }),
        ).resolves.toBe("success");
        expect(notifyError).not.toHaveBeenCalled();
        if (publicSync === "degraded") {
          expect(notifyWarning).toHaveBeenCalledExactlyOnceWith(
            "已保存，公开内容同步未完成，请稍后检查公开页面",
          );
          expect(notifySuccess).not.toHaveBeenCalled();
        } else {
          expect(notifySuccess).toHaveBeenCalledExactlyOnceWith("保存成功");
          expect(notifyWarning).not.toHaveBeenCalled();
        }
      }
    },
  );

  it("does not warn for unsuccessful mutation results", async () => {
    const notifyWarning = vi.fn();
    await expect(
      runAdminMutation({
        input: undefined,
        mutate: async () => ({ success: false, publicSync: "degraded" }),
        isSuccess: (result) => result.success,
        refetch: vi.fn(),
        notifySuccess: vi.fn(),
        notifyWarning,
        notifyError: vi.fn(),
        successMessage: "保存成功",
        errorMessage: "保存失败",
      }),
    ).resolves.toBe("noop");
    expect(notifyWarning).not.toHaveBeenCalled();
  });
});

it("preserves success feedback for callers without a warning notifier", async () => {
  const notifySuccess = vi.fn();
  await expect(
    runAdminMutation({
      input: undefined,
      mutate: async () => ({ publicSync: "degraded" }),
      refetch: vi.fn(),
      notifySuccess,
      notifyError: vi.fn(),
      successMessage: "保存成功",
      errorMessage: "保存失败",
    }),
  ).resolves.toBe("success");
  expect(notifySuccess).toHaveBeenCalledExactlyOnceWith("保存成功");
});
