import { describe, expect, it, vi } from "vitest";
import { ModalType } from "./modal-type";
import {
  closeAdminDialog,
  createInitialAdminDialogState,
  openAddAdminDialog,
  openEditAdminDialog,
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

  it("deletes selected ids and clears selection after the action settles", async () => {
    const deleteItems = vi.fn().mockResolvedValue("error");
    const onSelectionChange = vi.fn();

    await submitAdminBatchDelete({
      selectedRows: [{ id: "record-1" }, { id: "record-2" }],
      deleteItems,
      onSelectionChange,
    });

    expect(deleteItems).toHaveBeenCalledWith(["record-1", "record-2"]);
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

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
