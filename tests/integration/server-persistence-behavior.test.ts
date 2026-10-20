const invalidator = {
  invalidate: async () => ({ state: "completed" as const }),
};
import { destroyTags } from "@/features/tag/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: vi.fn(
    async (_name: string, _kind: string, operation: () => unknown) =>
      operation(),
  ),
}));
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.test" },
}));
vi.mock("@/lib/db/query/query-builders", () => ({
  buildDrizzleWhere: vi.fn(() => undefined),
  buildDrizzleOrderBy: vi.fn(() => undefined),
}));

import { createMediaRepository } from "@/features/media/server/media-repository";

import { createUserRepository } from "@/features/user/server/user-repository";
import { user } from "@/lib/db/schema";
import * as schema from "@/lib/db/schema";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

function fakeDb() {
  const db = {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  };
  return db;
}

describe("feature server 持久化行为", () => {
  beforeEach(() => vi.clearAllMocks());

  it("media authorization does not create provisional records", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
    await createMediaRepository(asMockDatabase(db)).authorizeUpload("author");
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("media deletion runs storage before physical row deletion in one transaction", async () => {
    const db = createMockDb();
    const { mediaRow } = await import("@tests/helpers/media-registration");
    const targets = [mediaRow()];
    db.select.mockImplementation((projection?: object) => ({
      from: (table: object) => {
        if (table === schema.user && !projection) {
          const read = createMockDb();
          read.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
          return read;
        }
        if (table === schema.media)
          return { where: vi.fn().mockResolvedValue(targets) };
        if (table === schema.post) {
          const read = createMockDb();
          read.limit.mockResolvedValue([]);
          return read;
        }
        return [];
      },
    }));
    const remove = vi.fn(async () => {
      expect(db.delete).not.toHaveBeenCalled();
    });
    await createMediaRepository(asMockDatabase(db)).deleteWithStorage(
      targets.map((row) => row.id),
      "author",
      remove,
    );
    expect(remove).toHaveBeenCalledWith(targets);
    expect(db.delete).toHaveBeenCalledWith(schema.media);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.transaction).toHaveBeenCalledOnce();
  });

  it("tag destroy 使用批量删除并返回成功", async () => {
    const db = createMockDb();
    const where = vi.fn().mockResolvedValue(undefined);
    db.delete.mockReturnValue({ where });

    await expect(
      destroyTags(asMockDatabase(db), ["tag-1", "tag-2"], invalidator),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(where).toHaveBeenCalled();
  });

  it("user detail 返回安全的 id 和 name", async () => {
    const db = fakeDb();
    const limit = vi.fn().mockResolvedValue([{ id: "user-1", name: "管理员" }]);
    const where = vi.fn().mockReturnValue({ limit });
    db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where }) });

    await expect(
      createUserRepository(asMockDatabase(db)).detail("user-1"),
    ).resolves.toEqual({ id: "user-1", name: "管理员" });
    expect(db.select).toHaveBeenCalledExactlyOnceWith({
      id: user.id,
      name: user.name,
    });
  });
});
