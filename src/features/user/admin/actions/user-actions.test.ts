import { describe, expect, it, vi } from "vitest";

import { UserLevel } from "@/packages/domain/identity/user";
import { UserStatus } from "@/packages/domain/identity/user";
import type { UserViewModel as UserEntity } from "../../presentation/user-view-model";

import { submitUserUpdate } from "./user-actions";

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

  it("reports update failures without refreshing", async () => {
    const refetch = vi.fn();
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitUserUpdate({
        record: editor,
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

});
