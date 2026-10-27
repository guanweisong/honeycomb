import { updateSetting } from "@/features/setting/server/setting-update";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import * as schema from "@/lib/db/schema";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));

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

describe("feature persistence contracts", () => {
  const invalidator = () => ({
    invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
  });
  it("setting writes preserve the saved identity", async () => {
    const db = createMockDb();
    const id = "507f1f77bcf86cd799439011";
    db.returning.mockResolvedValue([{ id, version: 1 }]);
    db.from.mockImplementation((table: object) => {
      const read = createMockDb();
      if (table === schema.user)
        read.limit.mockResolvedValue([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
      else read.where.mockResolvedValue([]);
      return read;
    });
    await expect(
      updateSetting(
        asMockDatabase(db),
        { id, expectedVersion: 0, siteName: { en: "Saved" } },
        "author",
        invalidator(),
      ),
    ).resolves.toMatchObject({ id, version: 1, publicSync: "completed" });
    expect(db.transaction).toHaveBeenCalledOnce();
  });
});

describe("site snapshot commands", () => {
  const id = "111111111111111111111111";
  const cache = () => ({
    invalidate: vi.fn().mockResolvedValue({ state: "completed" }),
  });
  it("returns committed settings version if public invalidation unexpectedly throws", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
    db.returning.mockResolvedValue([{ id, version: 1 }]);
    db.where
      .mockReturnValueOnce(db)
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce([]);
    const invalidator = {
      invalidate: vi.fn().mockRejectedValue(new Error("cache unavailable")),
    };
    await expect(
      updateSetting(
        asMockDatabase(db),
        { id, expectedVersion: 0, siteName: { zh: "本地" } },
        id,
        invalidator,
      ),
    ).resolves.toMatchObject({ version: 1, publicSync: "degraded" });
  });
  it("rejects settings conflicts before deleting translations", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
    db.returning.mockResolvedValue([]);
    await expect(
      updateSetting(
        asMockDatabase(db),
        { id, expectedVersion: 0, siteName: { zh: "本地" } },
        id,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.delete).not.toHaveBeenCalled();
  });
});

describe("required persistence results", () => {
  const invalidator = {
    invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
  };
  function authorize(db: ReturnType<typeof createMockDb>) {
    db.from.mockImplementation((table: object) => {
      if (table === schema.user) {
        const actor = createMockDb();
        actor.limit.mockResolvedValue([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
        return Object.assign(Promise.resolve([]), actor);
      }
      if (
        table === schema.postTranslation ||
        table === schema.settingTranslation ||
        table === schema.pageTranslation
      ) {
        const read = createMockDb();
        read.where.mockResolvedValue([]);
        return read;
      }
      return db;
    });
  }
  it.each([false, true])(
    "rejects a missing or stale setting write target (exists: %s)",
    async (exists) => {
      const db = createMockDb();
      authorize(db);
      db.returning.mockResolvedValue([]);
      db.limit.mockResolvedValue(
        exists ? [{ id: "507f1f77bcf86cd799439011" }] : [],
      );
      await expect(
        updateSetting(
          asMockDatabase(db),
          {
            id: "507f1f77bcf86cd799439011",
            expectedVersion: 0,
            siteName: { en: "Changed" },
          },
          "author",
          invalidator,
        ),
      ).rejects.toMatchObject({ code: exists ? "CONFLICT" : "NOT_FOUND" });
    },
  );
});
