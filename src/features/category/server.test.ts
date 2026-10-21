import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
import { createCategory, destroyCategories, updateCategory } from "./server";
import { EnableStatus } from "@/lib/validation/enable-status";

const base = {
  title: { en: "A", zh: "甲" },
  description: { en: "", zh: "" },
  path: "a",
};
const row = {
  id: "a",
  parent: null,
  path: "a",
  status: EnableStatus.ENABLE,
  createdAt: null,
  updatedAt: null,
};
const invalidator = () => ({
  invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
});
const translations = [
  { categoryId: "a", locale: "en", title: "A", description: "" },
  { categoryId: "a", locale: "zh", title: "甲", description: "" },
];

describe("Category server operations", () => {
  it("拒绝分类将自己设置为父节点", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([row]);
    await expect(
      updateCategory(
        asMockDatabase(db),
        { id: "a", parent: "a" },
        invalidator(),
      ),
    ).rejects.toThrow("分类不能将自己设置为父节点");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("拒绝分类形成父子循环", async () => {
    const db = createMockDb();
    db.limit
      .mockResolvedValueOnce([{ ...row, parent: "b" }])
      .mockResolvedValueOnce([{ ...row, id: "b", parent: "a" }]);
    await expect(
      updateCategory(
        asMockDatabase(db),
        { id: "a", parent: "b" },
        invalidator(),
      ),
    ).rejects.toThrow("分类父子关系不能形成循环");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("拒绝分类使用已存在的路径", async () => {
    const db = createMockDb();
    db.limit
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([{ id: "taken" }]);
    await expect(
      updateCategory(
        asMockDatabase(db),
        { id: "a", path: "taken" },
        invalidator(),
      ),
    ).rejects.toThrow("分类路径已经存在");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("通过校验后更新分类", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);
    db.returning.mockResolvedValue([row]);
    db.where
      .mockReturnValueOnce(db)
      .mockReturnValueOnce(db)
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce(translations);
    const cache = invalidator();
    await expect(
      updateCategory(asMockDatabase(db), { id: "a", ...base }, cache),
    ).resolves.toMatchObject({
      ...row,
      ...base,
      description: null,
      publicSync: "completed",
    });
    expect(db.set).toHaveBeenCalledWith({
      path: "a",
      updatedAt: expect.any(String),
    });
    expect(cache.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
      refreshPostIndex: true,
      refreshSitemap: true,
    });
    expect(db.transaction).toHaveBeenCalledBefore(cache.invalidate);
  });

  it("创建和删除分类也会失效菜单派生的 sitemap", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([]);
    db.returning.mockResolvedValue([row]);
    const cache = invalidator();
    await expect(
      createCategory(asMockDatabase(db), base, cache),
    ).resolves.toMatchObject({ id: "a", publicSync: "completed" });
    await expect(
      destroyCategories(asMockDatabase(db), ["a"], cache),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    const expectedPlan = {
      refreshLayout: true,
      refreshPostIndex: true,
      refreshSitemap: true,
    };
    expect(cache.invalidate).toHaveBeenNthCalledWith(1, expectedPlan);
    expect(cache.invalidate).toHaveBeenNthCalledWith(2, expectedPlan);
  });

  it("写入失败时不刷新缓存", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([]);
    db.transaction.mockRejectedValue(new Error("database failed"));
    const cache = invalidator();
    await expect(
      createCategory(asMockDatabase(db), base, cache),
    ).rejects.toThrow("database failed");
    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});
