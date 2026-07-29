import { describe, expect, it, vi } from "vitest";

import { ModalType } from "@/app/admin/types/ModalType";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { UserStatus } from "@/packages/trpc/api/modules/user/types/user.status";
import type { UserEntity } from "@/packages/trpc/api/modules/user/types/user.entity";

import {
  closeUserDialog,
  createInitialUserDialogState,
  openAddUserDialog,
  openEditUserDialog,
  submitUserCreate,
  submitUserDelete,
  submitUserUpdate,
} from "./userActions";

const editor = {
  id: "editor-1",
  name: "Editor",
  email: "editor@example.test",
  level: UserLevel.EDITOR,
  status: UserStatus.ENABLE,
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: null,
} as UserEntity;

describe("user action state", () => {
  it("opens add and edit dialogs with isolated records and closes cleanly", () => {
    expect(createInitialUserDialogState()).toEqual({
      type: ModalType.ADD,
      open: false,
    });
    expect(openAddUserDialog()).toEqual({
      type: ModalType.ADD,
      open: true,
      record: undefined,
    });
    expect(openEditUserDialog(editor)).toEqual({
      type: ModalType.EDIT,
      open: true,
      record: editor,
    });
    expect(closeUserDialog()).toEqual({ open: false });
  });

  it("reports success only after updating the selected target and refetching", async () => {
    const update = vi.fn().mockResolvedValue(editor);
    const refetch = vi.fn();
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitUserUpdate({
        record: editor,
        values: { id: "forged-id", name: "Updated" },
        update,
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("success");
    expect(update).toHaveBeenCalledWith({ id: "editor-1", name: "Updated" });
    expect(refetch).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith("更新成功");
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("fails closed when an edit target is missing", async () => {
    const update = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitUserUpdate({
        record: undefined,
        values: { id: "forged-id", name: "Updated" },
        update,
        refetch: vi.fn(),
        notifySuccess: vi.fn(),
        notifyError,
      }),
    ).resolves.toBe("missing-target");
    expect(update).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith("缺少用户ID");
  });

  it("preserves create success copy and refresh behavior", async () => {
    const create = vi.fn().mockResolvedValue(editor);
    const refetch = vi.fn();
    const notifySuccess = vi.fn();

    await expect(
      submitUserCreate({
        values: {
          name: "New User",
          email: "new@example.test",
          password: "password123",
          level: UserLevel.GUEST,
          status: UserStatus.ENABLE,
        },
        create,
        refetch,
        notifySuccess,
        notifyError: vi.fn(),
      }),
    ).resolves.toBe("success");
    expect(create).toHaveBeenCalledWith({
      name: "New User",
      email: "new@example.test",
      password: "password123",
      level: UserLevel.GUEST,
      status: UserStatus.ENABLE,
    });
    expect(refetch).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith("添加成功");
  });

  it("only refreshes and reports delete success for a successful response", async () => {
    const refetch = vi.fn();
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitUserDelete({
        ids: ["editor-1"],
        destroy: vi.fn().mockResolvedValue({ success: false }),
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("noop");
    expect(refetch).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();

    await expect(
      submitUserDelete({
        ids: ["editor-1"],
        destroy: vi.fn().mockRejectedValue(new Error("delete failed")),
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("error");
    expect(notifyError).toHaveBeenCalledWith("删除失败");
  });
});
