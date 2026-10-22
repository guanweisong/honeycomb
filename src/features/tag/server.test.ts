import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
import {
  createTag,
  destroyTags,
  updateTag,
} from "@/features/tag/server/tag-commands";

const row = { id: "tag-1", createdAt: null, updatedAt: null };
const name = { en: "Tag", zh: "标签" };

describe("Tag server operations", () => {
  it("在写入成功后刷新公开内容", async () => {
    const invalidator = {
      invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
    };
    const db = createMockDb();
    db.returning.mockResolvedValue([row]);
    db.limit.mockResolvedValue([row]);
    db.where
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce([
        { tagId: row.id, locale: "en", name: "Tag" },
        { tagId: row.id, locale: "zh", name: "标签" },
      ])
      .mockReturnValue(db);
    await expect(
      createTag(asMockDatabase(db), { name }, invalidator),
    ).resolves.toEqual({ ...row, name, publicSync: "completed" });
    await expect(
      updateTag(asMockDatabase(db), { id: row.id }, invalidator),
    ).resolves.toEqual({ ...row, name, publicSync: "completed" });
    await expect(
      destroyTags(asMockDatabase(db), [row.id], invalidator),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(invalidator.invalidate).toHaveBeenCalledTimes(3);
    for (let i = 1; i <= 3; i++)
      expect(invalidator.invalidate).toHaveBeenNthCalledWith(i, {
        refreshLayout: true,
        refreshPostIndex: true,
      });
  });

  it("写入失败时不刷新缓存", async () => {
    const invalidator = { invalidate: vi.fn() };
    const error = new Error("database failed");
    const db = createMockDb();
    db.transaction.mockRejectedValue(error);
    await expect(
      updateTag(asMockDatabase(db), { id: row.id }, invalidator),
    ).rejects.toBe(error);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });

  it("tag destroy 使用批量删除并返回成功", async () => {
    const invalidator = {
      invalidate: async () => ({ state: "completed" as const }),
    };
    const db = createMockDb();
    const where = vi.fn().mockResolvedValue(undefined);
    db.delete.mockReturnValue({ where });

    await expect(
      destroyTags(asMockDatabase(db), ["tag-1", "tag-2"], invalidator),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(where).toHaveBeenCalled();
  });
});
