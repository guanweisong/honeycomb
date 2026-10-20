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
vi.mock("@/lib/db/query/tools", () => ({
  buildDrizzleWhere: vi.fn(() => undefined),
  buildDrizzleOrderBy: vi.fn(() => undefined),
}));

import { createMediaRepository } from "@/features/media/server/media-repository";

import { createUserRepository } from "@/features/user/server/user-repository";
import { asMockDatabase } from "@tests/helpers/test-utils";

function fakeDb() {
  const db = {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  };
  return db;
}

describe("Drizzle repository adapter 行为", () => {
  beforeEach(() => vi.clearAllMocks());

  it("media create 生成资产 URL", async () => {
    const db = fakeDb();
    const returning = vi
      .fn()
      .mockResolvedValue([{ id: "media-1", url: "https://assets.test/a.png" }]);
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning }),
    });

    const result = await createMediaRepository(asMockDatabase(db)).create({
      name: "a.png",
      size: 10,
      type: "image/png",
      key: "a.png",
    });

    expect(result).toEqual({ id: "media-1", url: "https://assets.test/a.png" });
    expect(returning).toHaveBeenCalled();
  });

  it("media delete adapter only reads targets and deletes database records", async () => {
    const db = fakeDb();
    const targets = [{ id: "media-1", key: "a.png" }];
    const selectWhere = vi.fn().mockResolvedValue(targets);
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({ where: selectWhere }),
    });
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    db.delete.mockReturnValue({ where: deleteWhere });
    const repository = createMediaRepository(asMockDatabase(db));

    await expect(repository.findDeleteTargets(["media-1"])).resolves.toEqual(
      targets,
    );
    await expect(repository.deleteRecords(["media-1"])).resolves.toEqual({
      success: true,
    });

    expect(selectWhere).toHaveBeenCalledOnce();
    expect(deleteWhere).toHaveBeenCalledOnce();
  });

  it("tag destroy 使用批量删除并返回成功", async () => {
    const db = fakeDb();
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
  });
});
