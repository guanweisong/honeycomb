import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
import { MenuType } from "./menu-types";
import { saveAllMenus } from "./server";

const item = (id: string, parent?: string | null) => ({
  id,
  type: MenuType.CUSTOM,
  parent,
  power: 1,
});
const invalidator = () => ({
  invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
});

describe("Menu server operations", () => {
  it.each([
    ["空菜单", []],
    ["重复菜单 ID", [item("a"), item("a")]],
    ["父节点不存在", [item("a", "missing")]],
    ["菜单树循环", [item("a", "b"), item("b", "a")]],
    ["菜单自引用", [item("a", "a")]],
  ])("拒绝%s", async (_name, input) => {
    const db = createMockDb();
    await expect(
      saveAllMenus(asMockDatabase(db), input, invalidator()),
    ).rejects.toThrow();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("通过校验后保存菜单树", async () => {
    const db = createMockDb();
    db.returning.mockResolvedValue([{ id: "first" }, { id: "second" }]);
    const cache = invalidator();
    await expect(
      saveAllMenus(asMockDatabase(db), [item("a"), item("b", "a")], cache),
    ).resolves.toEqual({ count: 2, publicSync: "completed" });
    expect(db.transaction).toHaveBeenCalledOnce();
    const rows = db.values.mock.calls[0]?.[0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ customId: "a", parent: null });
    expect(rows[1]).toMatchObject({ customId: "b", parent: rows[0].id });
    expect(cache.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
      refreshSitemap: true,
    });
  });

  it("事务失败时不刷新缓存", async () => {
    const db = createMockDb();
    db.transaction.mockRejectedValue(new Error("database failed"));
    const cache = invalidator();
    await expect(
      saveAllMenus(asMockDatabase(db), [item("a")], cache),
    ).rejects.toThrow("database failed");
    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});
