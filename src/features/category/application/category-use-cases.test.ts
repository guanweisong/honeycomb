import { describe, expect, it, vi } from "vitest";
import { updateCategory } from "./category-use-cases";

const base = { title: { en: "A", zh: "甲" }, description: { en: "", zh: "" }, path: "a" };

describe("Category use cases", () => {
  it("拒绝分类将自己设置为父节点", async () => {
    const find = vi.fn().mockResolvedValue({ id: "a", parent: null, path: "a", status: "ENABLE" });
    const update = vi.fn();

    await expect(
      updateCategory({ find, pathExists: vi.fn(), update } as never, { id: "a", parent: "a" }),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });

  it("拒绝分类形成父子循环", async () => {
    const find = vi.fn()
      .mockResolvedValueOnce({ id: "a", parent: "b", path: "a", status: "ENABLE" })
      .mockResolvedValueOnce({ id: "b", parent: "a", path: "b", status: "ENABLE" });
    const update = vi.fn();

    await expect(
      updateCategory({ find, pathExists: vi.fn(), update } as never, { id: "a", parent: "b" }),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });

  it("拒绝分类使用已存在的路径", async () => {
    const find = vi.fn().mockResolvedValue({ id: "a", parent: null, path: "old", status: "ENABLE" });
    const pathExists = vi.fn().mockResolvedValue(true);
    const update = vi.fn();

    await expect(
      updateCategory({ find, pathExists, update } as never, { id: "a", path: "taken" }),
    ).rejects.toThrow();
    expect(pathExists).toHaveBeenCalledWith("taken", "a");
    expect(update).not.toHaveBeenCalled();
  });

  it("通过校验后更新分类", async () => {
    const find = vi.fn().mockResolvedValue({ id: "a", parent: null, path: "a", status: "ENABLE" });
    const update = vi.fn().mockResolvedValue({ id: "a" });

    await updateCategory({ find, pathExists: vi.fn().mockResolvedValue(false), update } as never, { id: "a", ...base });

    expect(update).toHaveBeenCalledWith({ id: "a", ...base });
  });
});
