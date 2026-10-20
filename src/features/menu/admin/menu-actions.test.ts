import { describe, expect, it, vi } from "vitest";
import { MenuType } from "@/features/menu/menu-types";
import type { MenuEntityTree } from "./menu-transforms";
import { submitMenuChanges } from "./menu-actions";

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
] as MenuEntityTree[];

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
