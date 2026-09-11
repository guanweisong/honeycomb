import { describe, expect, it, vi } from "vitest";
import {
  createCategory,
  destroyCategories,
  updateCategory,
} from "./category-use-cases";

const base = {
  title: { en: "A", zh: "甲" },
  description: { en: "", zh: "" },
  path: "a",
};
const invalidator = () => ({
  invalidate: vi.fn().mockResolvedValue(undefined),
});

describe("Category use cases", () => {
  it("拒绝分类将自己设置为父节点", async () => {
    const find = vi
      .fn()
      .mockResolvedValue({
        id: "a",
        parent: null,
        path: "a",
        status: "ENABLE",
      });
    const update = vi.fn();

    await expect(
      updateCategory(
        { find, pathExists: vi.fn(), update },
        { id: "a", parent: "a" },
        invalidator(),
      ),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });

  it("拒绝分类形成父子循环", async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce({
        id: "a",
        parent: "b",
        path: "a",
        status: "ENABLE",
      })
      .mockResolvedValueOnce({
        id: "b",
        parent: "a",
        path: "b",
        status: "ENABLE",
      });
    const update = vi.fn();

    await expect(
      updateCategory(
        { find, pathExists: vi.fn(), update },
        { id: "a", parent: "b" },
        invalidator(),
      ),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });

  it("拒绝分类使用已存在的路径", async () => {
    const find = vi
      .fn()
      .mockResolvedValue({
        id: "a",
        parent: null,
        path: "old",
        status: "ENABLE",
      });
    const pathExists = vi.fn().mockResolvedValue(true);
    const update = vi.fn();

    await expect(
      updateCategory(
        { find, pathExists, update },
        { id: "a", path: "taken" },
        invalidator(),
      ),
    ).rejects.toThrow();
    expect(pathExists).toHaveBeenCalledWith("taken", "a");
    expect(update).not.toHaveBeenCalled();
  });

  it("通过校验后更新分类", async () => {
    const find = vi
      .fn()
      .mockResolvedValue({
        id: "a",
        parent: null,
        path: "a",
        status: "ENABLE",
      });
    const update = vi.fn().mockResolvedValue({ id: "a" });
    const cache = invalidator();

    await updateCategory(
      { find, pathExists: vi.fn().mockResolvedValue(false), update },
      { id: "a", ...base },
      cache,
    );

    expect(update).toHaveBeenCalledWith({ id: "a", ...base });
    expect(cache.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
      refreshPostIndex: true,
      refreshSitemap: true,
    });
  });

  it("创建和删除分类也会失效菜单派生的 sitemap", async () => {
    const cache = invalidator();
    await createCategory(
      {
        create: vi.fn().mockResolvedValue({ id: "a" }),
        find: vi.fn(),
        pathExists: vi.fn().mockResolvedValue(false),
      },
      base,
      cache,
    );
    await destroyCategories(
      { destroy: vi.fn().mockResolvedValue({ success: true as const }) },
      ["a"],
      cache,
    );

    const expectedPlan = {
      refreshLayout: true,
      refreshPostIndex: true,
      refreshSitemap: true,
    };
    expect(cache.invalidate).toHaveBeenNthCalledWith(1, expectedPlan);
    expect(cache.invalidate).toHaveBeenNthCalledWith(2, expectedPlan);
  });
});
