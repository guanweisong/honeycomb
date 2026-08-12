import { describe, expect, it, vi } from "vitest";

import { ModalType } from "@/app/admin/types/ModalType";
import type { LinkEntity } from "@/packages/trpc/api/outputs";

import {
  closeLinkDialog,
  createInitialLinkDialogState,
  openAddLinkDialog,
  openEditLinkDialog,
  submitLinkBatchDelete,
  submitLinkCreate,
  submitLinkDelete,
  submitLinkUpdate,
} from "./linkActions";

const link = {
  id: "link-1",
  name: "OpenAI",
  url: "https://openai.com",
  logo: "https://openai.com/logo.png",
  description: null,
  status: "ENABLE",
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: null,
} as LinkEntity;

describe("link action state", () => {
  it("opens add and edit dialogs with isolated records and closes cleanly", () => {
    expect(createInitialLinkDialogState()).toEqual({
      type: ModalType.ADD,
      open: false,
    });
    expect(openAddLinkDialog()).toEqual({
      type: ModalType.ADD,
      open: true,
      record: undefined,
    });
    expect(openEditLinkDialog(link)).toEqual({
      type: ModalType.EDIT,
      open: true,
      record: link,
    });
    expect(closeLinkDialog()).toEqual({ open: false });
  });

  it("preserves create success copy and refresh behavior", async () => {
    const create = vi.fn().mockResolvedValue(link);
    const refetch = vi.fn();
    const notifySuccess = vi.fn();

    await expect(
      submitLinkCreate({
        values: {
          name: "OpenAI",
          url: "https://openai.com",
          logo: "https://openai.com/logo.png",
          status: "ENABLE",
        },
        create,
        refetch,
        notifySuccess,
        notifyError: vi.fn(),
      }),
    ).resolves.toBe("success");
    expect(create).toHaveBeenCalledWith({
      name: "OpenAI",
      url: "https://openai.com",
      logo: "https://openai.com/logo.png",
      status: "ENABLE",
    });
    expect(refetch).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith("添加成功");
  });

  it("reports create and update failures without refreshing", async () => {
    const refetch = vi.fn();
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitLinkCreate({
        values: {
          name: "OpenAI",
          url: "https://openai.com",
          logo: "https://openai.com/logo.png",
          status: "ENABLE",
        },
        create: vi.fn().mockRejectedValue(new Error("create failed")),
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("error");
    expect(notifyError).toHaveBeenCalledWith("添加失败");

    await expect(
      submitLinkUpdate({
        record: link,
        values: { id: "forged-id", name: "Updated" },
        update: vi.fn().mockRejectedValue(new Error("update failed")),
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("error");
    expect(notifyError).toHaveBeenCalledWith("更新失败");
    expect(refetch).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it("updates only the selected target and fails closed without one", async () => {
    const update = vi.fn().mockResolvedValue(link);
    const refetch = vi.fn();
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitLinkUpdate({
        record: link,
        values: { id: "forged-id", name: "Updated" },
        update,
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("success");
    expect(update).toHaveBeenCalledWith({ id: "link-1", name: "Updated" });
    expect(refetch).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith("更新成功");

    update.mockClear();
    await expect(
      submitLinkUpdate({
        record: undefined,
        values: { id: "forged-id", name: "Updated" },
        update,
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("missing-target");
    expect(update).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith("缺少记录ID");
  });

  it("refreshes only successful deletes and clears batch selection afterward", async () => {
    const refetch = vi.fn();
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitLinkDelete({
        ids: ["link-1"],
        destroy: vi.fn().mockResolvedValue({ success: false }),
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("noop");
    expect(refetch).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();

    const deleteItems = vi.fn().mockResolvedValue("error");
    const onSelectionChange = vi.fn();
    await submitLinkBatchDelete({
      selectedRows: [link, { ...link, id: "link-2" }],
      deleteItems,
      onSelectionChange,
    });
    expect(deleteItems).toHaveBeenCalledWith(["link-1", "link-2"]);
    expect(onSelectionChange).toHaveBeenCalledWith([]);

    await expect(
      submitLinkDelete({
        ids: ["link-1"],
        destroy: vi.fn().mockResolvedValue({ success: true }),
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("success");
    expect(refetch).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith("删除成功");

    await expect(
      submitLinkDelete({
        ids: ["link-1"],
        destroy: vi.fn().mockRejectedValue(new Error("delete failed")),
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("error");
    expect(notifyError).toHaveBeenCalledWith("删除失败");
  });
});
