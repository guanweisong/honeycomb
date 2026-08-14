import { describe, expect, it, vi } from "vitest";
import { MenuType } from "@/packages/domain/navigation/menu";
import type { MenuEntityTree } from "../transforms/menuTransforms";
import { submitMenuChanges } from "./menuActions";

const checkedList = [
  {
    id: "category-1",
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
    const saveAll = vi.fn().mockResolvedValue({ count: 1 });
    const refetch = vi.fn().mockResolvedValue(undefined);
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    const state = await submitMenuChanges({
      checkedList,
      saveAll,
      refetch,
      notifySuccess,
      notifyError,
    });

    expect(state).toBe("success");
    expect(saveAll).toHaveBeenCalledWith([
      { id: "category-1", type: MenuType.CATEGORY, power: 0 },
    ]);
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
      saveAll,
      refetch,
      notifySuccess,
      notifyError,
    });

    expect(state).toBe("error");
    expect(notifyError).toHaveBeenCalledWith("更新失败");
    expect(refetch).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
