import { describe, expect, it, vi } from "vitest";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { createUserRepository } from "@/features/user/server/user-repository";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import {
  createUser,
  destroyUsers,
  updateUser,
} from "@/features/user/server/user-commands";

const validUserId = "000000000000000000000001";
const invalidator = () => ({
  invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
});

describe("User commands", () => {
  it("创建用户后刷新公开作者快照", async () => {
    const create = vi.fn().mockResolvedValue({ id: validUserId });
    const cache = invalidator();

    await createUser(
      { create },
      {
        name: "user",
        email: "user@example.com",
        password: "password123",
      },
      cache,
    );

    expect(cache.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
      refreshPostIndex: true,
    });
  });

  it("应用层创建入口拒绝非法邮箱且不调用仓储", () => {
    const create = vi.fn();

    expect(() =>
      createUser(
        { create },
        { name: "user", email: "invalid", password: "123456" },
        invalidator(),
      ),
    ).toThrow();
    expect(create).not.toHaveBeenCalled();
  });

  it("账号状态变更成功后返回持久化结果，并在写入完成后刷新公开数据", async () => {
    const saved = { id: validUserId, status: UserStatus.DISABLE };
    const update = vi.fn().mockResolvedValue(saved);
    const cache = invalidator();
    const changes = { id: validUserId, status: UserStatus.DISABLE };
    await expect(
      updateUser({ update }, changes, UserLevel.ADMIN, cache),
    ).resolves.toEqual({ ...saved, publicSync: "completed" });
    expect(update).toHaveBeenCalledExactlyOnceWith(changes, UserLevel.ADMIN);
    expect(update).toHaveBeenCalledBefore(cache.invalidate);
    expect(cache.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
      refreshPostIndex: true,
    });
  });

  it("允许删除普通账号并刷新公开数据", async () => {
    const destroy = vi.fn().mockResolvedValue({ success: true as const });
    const cache = invalidator();
    await expect(
      destroyUsers({ destroy }, ["editor-1"], cache),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(cache.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
      refreshPostIndex: true,
    });
  });

  it("状态写入失败时原样抛错且不失效缓存", async () => {
    const failure = new Error("write failed");
    const update = vi.fn().mockRejectedValue(failure);
    const cache = invalidator();
    await expect(
      updateUser(
        { update },
        { id: validUserId, status: UserStatus.DISABLE },
        UserLevel.ADMIN,
        cache,
      ),
    ).rejects.toBe(failure);
    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});

describe("User write protection", () => {
  const admin = {
    id: validUserId,
    status: UserStatus.ENABLE,
    level: UserLevel.ADMIN,
  };

  it.each([
    {
      changes: { status: UserStatus.DISABLE },
      message: "非管理员不能修改管理员账号",
    },
    { changes: { level: UserLevel.EDITOR }, message: "管理员账号不能降级" },
    {
      changes: { level: UserLevel.EDITOR, status: UserStatus.DISABLE },
      message: "管理员账号不能降级",
    },
  ])("在写入前拒绝 $message", async ({ changes, message }) => {
    const db = createMockDb();
    db.where.mockResolvedValue([admin]);
    const cache = invalidator();
    await expect(
      updateUser(
        createUserRepository(asMockDatabase(db)),
        { id: validUserId, ...changes },
        UserLevel.EDITOR,
        cache,
      ),
    ).rejects.toMatchObject({ code: "PROTECTED_USER", message });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.select).toHaveBeenCalledOnce();
    expect(db.update).not.toHaveBeenCalled();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it("在同一事务拒绝包含管理员的删除批次", async () => {
    const db = createMockDb();
    db.where.mockResolvedValue([admin]);
    const cache = invalidator();
    await expect(
      destroyUsers(
        createUserRepository(asMockDatabase(db)),
        [validUserId],
        cache,
      ),
    ).rejects.toMatchObject({ code: "PROTECTED_USER" });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.select).toHaveBeenCalledOnce();
    expect(db.delete).not.toHaveBeenCalled();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it("按当前级别授权状态变更，再持久化同时提交的提升和字段", async () => {
    const db = createMockDb();
    const saved = { ...admin, status: UserStatus.DISABLE, name: "updated" };
    db.where.mockResolvedValueOnce([{ ...admin, level: UserLevel.EDITOR }]);
    db.returning.mockResolvedValue([saved]);
    const cache = invalidator();
    const changes = {
      id: validUserId,
      name: "updated",
      level: UserLevel.ADMIN,
      status: UserStatus.DISABLE,
    };
    await expect(
      updateUser(
        createUserRepository(asMockDatabase(db)),
        changes,
        UserLevel.EDITOR,
        cache,
      ),
    ).resolves.toEqual({ ...saved, publicSync: "completed" });
    expect(db.select).toHaveBeenCalledOnce();
    expect(db.select).toHaveBeenCalledBefore(db.update);
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: changes.name,
        level: changes.level,
        status: changes.status,
      }),
    );
    expect(db.update).toHaveBeenCalledBefore(cache.invalidate);
  });

  it("找不到用户时不写入或失效缓存", async () => {
    const db = createMockDb();
    db.where.mockResolvedValue([]);
    const cache = invalidator();
    await expect(
      updateUser(
        createUserRepository(asMockDatabase(db)),
        { id: validUserId, status: UserStatus.DISABLE },
        UserLevel.ADMIN,
        cache,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "用户不存在" });
    expect(db.update).not.toHaveBeenCalled();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});
