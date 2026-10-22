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
  createLink,
  destroyLinks,
  updateLink,
} from "@/features/link/server/link-operations";
import { EnableStatus } from "@/lib/validation/enable-status";

const link = {
  id: "507f1f77bcf86cd799439031",
  name: "Example",
  url: "https://example.test",
  logo: "https://example.test/logo.png",
  description: null,
  status: EnableStatus.ENABLE,
  createdAt: null,
  updatedAt: null,
};
const input = { name: link.name, url: link.url, logo: link.logo };

describe("Link server operations", () => {
  it("每个成功写操作都会失效全部公开内容", async () => {
    const invalidator = {
      invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
    };
    const db = createMockDb();
    db.returning.mockResolvedValue([link]);
    await expect(
      createLink(asMockDatabase(db), input, invalidator),
    ).resolves.toEqual({ ...link, publicSync: "completed" });
    await expect(
      updateLink(
        asMockDatabase(db),
        { id: link.id, name: "Updated" },
        invalidator,
      ),
    ).resolves.toEqual({ ...link, publicSync: "completed" });
    await expect(
      destroyLinks(asMockDatabase(db), [link.id], invalidator),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(invalidator.invalidate).toHaveBeenCalledTimes(3);
    expect(invalidator.invalidate).toHaveBeenNthCalledWith(1, {
      refreshLayout: true,
    });
  });

  it("先持久化友情链接，再失效缓存", async () => {
    const order: string[] = [];
    const db = createMockDb();
    db.returning.mockImplementation(async () => {
      order.push("database");
      return [link];
    });
    const invalidator = {
      invalidate: vi.fn(async () => {
        order.push("cache");
        return { state: "completed" as const };
      }),
    };
    await createLink(asMockDatabase(db), input, invalidator);
    expect(order).toEqual(["database", "cache"]);
  });

  it("数据库写入失败时不失效缓存", async () => {
    const databaseError = new Error("database failed");
    const invalidator = { invalidate: vi.fn() };
    const db = createMockDb();
    db.returning.mockRejectedValue(databaseError);
    await expect(
      updateLink(asMockDatabase(db), { id: link.id }, invalidator),
    ).rejects.toBe(databaseError);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });

  it("持久化成功后的缓存降级仍返回删除结果", async () => {
    const db = createMockDb();
    await expect(
      destroyLinks(asMockDatabase(db), [link.id], {
        invalidate: vi.fn().mockResolvedValue({ state: "degraded" as const }),
      }),
    ).resolves.toEqual({ success: true, publicSync: "degraded" });
    expect(db.delete).toHaveBeenCalledOnce();
  });
});
