import { describe, expect, it, vi } from "vitest";
import { MenuType } from "@/packages/domain/navigation/menu";
import { saveAllMenus } from "./menu-use-cases";

const item = (id: string, parent?: string | null) => ({
  id,
  type: MenuType.CUSTOM,
  parent,
  power: 1,
});

describe("Menu use cases", () => {
  it.each([
    ["重复菜单 ID", [item("a"), item("a")]],
    ["父节点不存在", [item("a", "missing")]],
    ["菜单树循环", [item("a", "b"), item("b", "a")]],
    ["菜单自引用", [item("a", "a")]],
  ])("拒绝%s", async (_name, input) => {
    const saveAll = vi.fn();

    await expect(saveAllMenus({ saveAll }, input)).rejects.toThrow();
    expect(saveAll).not.toHaveBeenCalled();
  });

  it("通过校验后保存菜单树", async () => {
    const saveAll = vi.fn().mockResolvedValue({ count: 2 });
    const input = [item("a"), item("b", "a")];

    await expect(saveAllMenus({ saveAll }, input)).resolves.toEqual({ count: 2 });
    expect(saveAll).toHaveBeenCalledWith(input);
  });
});
