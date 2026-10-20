import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
import { updateSetting } from "./server";

describe("Setting server operations", () => {
  it("更新已提交后缓存降级仍返回持久化结果", async () => {
    const saved = {
      id: "111111111111111111111111",
      version: 1,
      siteRecordNo: null,
      siteRecordUrl: null,
      createdAt: null,
      updatedAt: null,
    };
    const db = createMockDb();
    db.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
    db.returning.mockResolvedValue([saved]);
    db.where
      .mockReturnValueOnce(db)
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce([])
      .mockReturnValue(db);
    const invalidator = {
      invalidate: vi.fn().mockResolvedValue({ state: "degraded" as const }),
    };
    await expect(
      updateSetting(
        asMockDatabase(db),
        { id: saved.id, expectedVersion: 0, siteRecordNo: null },
        "actor",
        invalidator,
      ),
    ).resolves.toEqual({
      ...saved,
      siteName: null,
      siteSubName: null,
      siteSignature: null,
      siteCopyright: null,
      publicSync: "degraded",
    });
    expect(db.transaction).toHaveBeenCalledBefore(invalidator.invalidate);
    expect(invalidator.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
    });
  });

  it("写入失败时不刷新缓存", async () => {
    const db = createMockDb();
    db.transaction.mockRejectedValue(new Error("database failed"));
    const invalidator = { invalidate: vi.fn() };
    await expect(
      updateSetting(
        asMockDatabase(db),
        {
          id: "111111111111111111111111",
          expectedVersion: 0,
          siteRecordNo: null,
        },
        "actor",
        invalidator,
      ),
    ).rejects.toThrow("database failed");
    expect(invalidator.invalidate).not.toHaveBeenCalled();
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
      const pending = updateSetting(
        asMockDatabase(db),
        {
          id: "111111111111111111111111",
          expectedVersion: 0,
          siteRecordNo: null,
        },
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
      updateSetting(
        asMockDatabase(db),
        {
          id: "111111111111111111111111",
          expectedVersion: 0,
          siteRecordNo: null,
        },
        "actor",
        cache,
      ),
    ).rejects.toBe(failure);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});
