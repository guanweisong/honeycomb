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
      id: "setting-1",
      siteRecordNo: null,
      siteRecordUrl: null,
      createdAt: null,
      updatedAt: null,
    };
    const db = createMockDb();
    db.limit.mockResolvedValue([saved]);
    db.where
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce([])
      .mockReturnValue(db);
    const invalidator = {
      invalidate: vi.fn().mockResolvedValue({ state: "degraded" as const }),
    };
    await expect(
      updateSetting(asMockDatabase(db), { id: saved.id }, invalidator),
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
      updateSetting(asMockDatabase(db), { id: "setting-1" }, invalidator),
    ).rejects.toThrow("database failed");
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});
