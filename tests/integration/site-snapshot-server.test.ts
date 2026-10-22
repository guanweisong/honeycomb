import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { MenuType } from "@/features/menu/types/menu.type";
import { saveAllMenus } from "@/features/menu/server/menu-commands";
import { updateSetting } from "@/features/setting/server/setting-update";
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, op: () => unknown) => op(),
}));
const id = "111111111111111111111111";
const items = [{ id, type: MenuType.CUSTOM, power: 0 }];
const cache = () => ({
  invalidate: vi.fn().mockResolvedValue({ state: "completed" }),
});

describe("site snapshot commands", () => {
  it("returns committed menu version if public invalidation unexpectedly throws", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
    db.returning
      .mockResolvedValueOnce([{ version: 1 }])
      .mockResolvedValueOnce([{ id }]);
    const invalidator = {
      invalidate: vi.fn().mockRejectedValue(new Error("cache unavailable")),
    };
    await expect(
      saveAllMenus(
        asMockDatabase(db),
        { items, expectedVersion: 0 },
        id,
        invalidator,
      ),
    ).resolves.toMatchObject({ version: 1, publicSync: "degraded" });
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
  it("rejects menu conflicts before replacing rows", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
    db.returning.mockResolvedValue([]);
    await expect(
      saveAllMenus(
        asMockDatabase(db),
        { items, expectedVersion: 0 },
        id,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.delete).not.toHaveBeenCalled();
  });
  it("rejects revoked menu actors before replacing rows", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ level: "GUEST", status: "ENABLE" }]);
    await expect(
      saveAllMenus(
        asMockDatabase(db),
        { items, expectedVersion: 0 },
        id,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.delete).not.toHaveBeenCalled();
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
