import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { MenuType } from "@/features/menu/types/menu.type";
import type { MenuEntityTree } from "@/app/admin/(dashboard)/menu/components/menu-transforms";
import { submitMenuChanges } from "@/app/admin/(dashboard)/menu/menu-actions";

const checkedList = [
  {
    id: "111111111111111111111111",
    title: { en: "Category", zh: "分类" },
    path: "/category",
    parent: null,
    createdAt: "2026-01-02T03:04:05.000Z",
    updatedAt: null,
    power: 7,
    type: MenuType.CATEGORY,
  },
] satisfies MenuEntityTree[];

describe("menu actions", () => {
  it("reports success after saving the normalized payload and refetching", async () => {
    const saveAll = vi.fn().mockResolvedValue({ count: 1, version: 1 });
    const refetch = vi.fn().mockResolvedValue(undefined);
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    const state = await submitMenuChanges({
      checkedList,
      expectedVersion: 0,
      saveAll,
      refetch,
      notifySuccess,
      notifyError,
    });

    expect(state).toMatchObject({ state: "success", refreshFailed: false });
    expect(saveAll).toHaveBeenCalledWith({
      expectedVersion: 0,
      items: [
        { id: "111111111111111111111111", type: MenuType.CATEGORY, power: 0 },
      ],
    });
    expect(notifySuccess).toHaveBeenCalledWith("更新成功");
    expect(refetch).toHaveBeenCalledOnce();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("reports an error without refetching when saveAll rejects", async () => {
    const saveAll = vi.fn().mockRejectedValue(new Error("save failed"));
    const refetch = vi.fn().mockResolvedValue(undefined);
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    const state = await submitMenuChanges({
      checkedList,
      expectedVersion: 0,
      saveAll,
      refetch,
      notifySuccess,
      notifyError,
    });

    expect(state).toEqual({ state: "unknown" });
    expect(notifyError).toHaveBeenCalledWith(
      "保存结果无法确认，本地输入已保留，请先核对服务器",
    );
    expect(refetch).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe("menu error classification", () => {
  it.each([
    [{ data: { code: "BAD_REQUEST" } }, "error"],
    [{ data: { code: "FORBIDDEN" } }, "error"],
    [{ data: { code: "UNAUTHORIZED" } }, "error"],
    [{ data: { code: "NOT_FOUND" } }, "error"],
    [{ data: { code: "CONFLICT" } }, "conflict"],
    [{ data: { code: "INTERNAL_SERVER_ERROR" } }, "unknown"],
    [{ data: { code: { toString: (): string => "FORBIDDEN" } } }, "unknown"],
    [new z.ZodError([]), "error"],
  ])("preserves classification %#", async (error, state) => {
    const refetch = vi.fn();
    expect(
      await submitMenuChanges({
        checkedList,
        expectedVersion: 0,
        saveAll: vi.fn().mockRejectedValue(error),
        refetch,
        notifySuccess: vi.fn(),
        notifyError: vi.fn(),
      }),
    ).toEqual({ state });
    expect(refetch).not.toHaveBeenCalled();
  });
});
