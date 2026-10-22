import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
import { MenuType } from "@/features/menu/types/menu.type";
import { listMenus } from "@/features/menu/server/menu-queries";
import { saveAllMenus } from "@/features/menu/server/menu-commands";

const item = (id: string, parent?: string | null) => ({
  id: id.padEnd(24, "0"),
  type: MenuType.CUSTOM,
  parent: parent ? parent.padEnd(24, "0") : parent,
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
      saveAllMenus(
        asMockDatabase(db),
        { items: input, expectedVersion: 0 },
        "actor",
        invalidator(),
      ),
    ).rejects.toThrow();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("通过校验后保存菜单树", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
    db.returning
      .mockResolvedValueOnce([{ version: 1 }])
      .mockResolvedValueOnce([{ id: "first" }, { id: "second" }]);
    const cache = invalidator();
    await expect(
      saveAllMenus(
        asMockDatabase(db),
        { items: [item("a"), item("b", "a")], expectedVersion: 0 },
        "actor",
        cache,
      ),
    ).resolves.toEqual({ count: 2, version: 1, publicSync: "completed" });
    expect(db.transaction).toHaveBeenCalledOnce();
    const rows = db.values.mock.calls[0]?.[0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      customId: "a".padEnd(24, "0"),
      parent: null,
    });
    expect(rows[1]).toMatchObject({
      customId: "b".padEnd(24, "0"),
      parent: rows[0].id,
    });
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
      saveAllMenus(
        asMockDatabase(db),
        { items: [item("a")], expectedVersion: 0 },
        "actor",
        cache,
      ),
    ).rejects.toThrow("database failed");
    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});

describe("BEGIN-only transaction retries", () => {
  it("keeps four attempts, 10/20/40ms delays and the existing conflict message", async () => {
    vi.useFakeTimers();
    try {
      const db = createMockDb();
      db.transaction.mockRejectedValue(
        Object.assign(new Error("busy"), { code: "SQLITE_BUSY" }),
      );
      const cache = { invalidate: vi.fn() };
      const pending = saveAllMenus(
        asMockDatabase(db),
        { items: [item("a")], expectedVersion: 0 },
        "actor",
        cache,
      );
      const rejected = expect(pending).rejects.toMatchObject({
        code: "CONFLICT",
        message: "保存暂时繁忙，请核对最新版本后重试",
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(db.transaction).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(10);
      expect(db.transaction).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(20);
      expect(db.transaction).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(40);
      await rejected;
      expect(db.transaction).toHaveBeenCalledTimes(4);
      expect(db.select).not.toHaveBeenCalled();
      expect(cache.invalidate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it("does not replay SQLITE_BUSY after entering the callback", async () => {
    const db = createMockDb();
    const failure = Object.assign(new Error("callback failed"), {
      code: "SQLITE_BUSY",
    });
    db.limit.mockRejectedValue(failure);
    const cache = { invalidate: vi.fn() };
    await expect(
      saveAllMenus(
        asMockDatabase(db),
        { items: [item("a")], expectedVersion: 0 },
        "actor",
        cache,
      ),
    ).rejects.toBe(failure);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});

it("groups each translation once while preserving title and branch semantics", async () => {
  const db = createMockDb();
  let reads = 0;
  const pages = Array.from({ length: 80 }, (_, index) => ({
    id: `page-${index}`,
  }));
  db.query.menu.findMany.mockResolvedValue(
    pages.map(({ id }, power) => ({
      id: `row-${id}`,
      pageId: id,
      categoryId: null,
      customId: null,
      type: MenuType.PAGE,
      parent: null,
      power,
      createdAt: null,
      updatedAt: null,
    })),
  );
  const translations = pages.flatMap(({ id }, index) => [
    {
      get pageId() {
        reads++;
        return id;
      },
      locale: "en",
      title: `Page ${index}`,
    },
    {
      get pageId() {
        reads++;
        return id;
      },
      locale: "zh",
      title: `页面 ${index}`,
    },
  ]);
  db.where.mockResolvedValueOnce(pages).mockResolvedValueOnce(translations);
  const result = await listMenus(asMockDatabase(db), "ALL");
  expect(result.total).toBe(80);
  expect(result.list[0]?.title).toEqual({ en: "Page 0", zh: "页面 0" });
  expect(result.list[79]?.title).toEqual({ en: "Page 79", zh: "页面 79" });
  expect(reads).toBeLessThanOrEqual(160 * 2);
});
