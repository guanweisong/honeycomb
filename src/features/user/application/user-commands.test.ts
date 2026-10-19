import { describe, expect, it, vi } from "vitest";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import type { UserRecord } from "./repository";
import {
  changeUserStatus,
  createUser,
  destroyUsers,
  updateUser,
} from "./user-commands";

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

  it("账号状态变更成功后返回持久化结果", async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ id: "user-1", status: UserStatus.DISABLE });
    await expect(
      changeUserStatus(
        { update },
        {
          id: "user-1",
          currentStatus: UserStatus.ENABLE,
          status: UserStatus.DISABLE,
          level: UserLevel.EDITOR,
          actorLevel: UserLevel.ADMIN,
        },
      ),
    ).resolves.toEqual({ id: "user-1", status: UserStatus.DISABLE });
    expect(update).toHaveBeenCalledWith({
      id: "user-1",
      status: UserStatus.DISABLE,
    });
  });

  it("更新用户状态时必须先经过用户聚合", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      status: UserStatus.ENABLE,
      level: UserLevel.EDITOR,
    });
    const update = vi
      .fn()
      .mockResolvedValue({ id: "user-1", status: UserStatus.DISABLE });

    const cache = invalidator();
    await updateUser(
      { getStatus, update },
      { id: validUserId, status: UserStatus.DISABLE },
      UserLevel.ADMIN,
      cache,
    );

    expect(getStatus).toHaveBeenCalledWith(validUserId);
    expect(update).toHaveBeenCalledWith({
      id: validUserId,
      status: UserStatus.DISABLE,
    });
    expect(cache.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
      refreshPostIndex: true,
    });
  });

  it("拒绝非管理员修改管理员账号状态", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      status: UserStatus.ENABLE,
      level: UserLevel.ADMIN,
    });
    const update = vi.fn();

    await expect(
      updateUser(
        { getStatus, update },
        { id: validUserId, status: UserStatus.DISABLE },
        UserLevel.EDITOR,
        invalidator(),
      ),
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });

  it("删除前由应用层阻止删除管理员账号", async () => {
    const destroy = vi.fn().mockResolvedValue({ success: true as const });
    const getStates = vi.fn().mockResolvedValue([
      {
        id: "admin-1",
        status: UserStatus.ENABLE,
        level: UserLevel.ADMIN,
      },
    ]);

    await expect(
      destroyUsers({ destroy, getStates }, ["admin-1"], invalidator()),
    ).rejects.toThrow();

    expect(destroy).not.toHaveBeenCalled();
  });

  it("允许应用层删除普通账号", async () => {
    const destroy = vi.fn().mockResolvedValue({ success: true as const });
    const getStates = vi.fn().mockResolvedValue([
      {
        id: "editor-1",
        status: UserStatus.ENABLE,
        level: UserLevel.EDITOR,
      },
    ]);
    const cache = invalidator();

    await expect(
      destroyUsers({ destroy, getStates }, ["editor-1"], cache),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(cache.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
      refreshPostIndex: true,
    });
  });

  it("更新前由应用层阻止管理员账号降级", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      status: UserStatus.ENABLE,
      level: UserLevel.ADMIN,
    });
    const update = vi.fn();

    await expect(
      updateUser(
        { getStatus, update },
        { id: validUserId, level: UserLevel.EDITOR },
        UserLevel.ADMIN,
        invalidator(),
      ),
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });
});

describe("User update sequencing", () => {
  it("按当前账号级别验证状态变更，再原样写入同时提交的级别和字段", async () => {
    const order: string[] = [];
    const saved: UserRecord = {
      id: validUserId,
      name: "updated",
      email: "user@example.com",
      level: UserLevel.ADMIN,
      status: UserStatus.DISABLE,
      createdAt: null,
      updatedAt: null,
    };
    const repository = {
      getStatus: vi.fn(async () => {
        order.push("read");
        return { status: UserStatus.ENABLE, level: UserLevel.EDITOR };
      }),
      update: vi.fn(async () => {
        order.push("write");
        return saved;
      }),
    };
    const cache = {
      invalidate: vi.fn(async () => {
        order.push("invalidate");
        return { state: "completed" as const };
      }),
    };
    const changes = {
      id: validUserId,
      name: "updated",
      level: UserLevel.ADMIN,
      status: UserStatus.DISABLE,
    };

    await expect(
      updateUser(repository, changes, UserLevel.EDITOR, cache),
    ).resolves.toEqual({ ...saved, publicSync: "completed" });
    expect(order).toEqual(["read", "write", "invalidate"]);
    expect(repository.update).toHaveBeenCalledExactlyOnceWith(changes);
  });

  it("先拒绝管理员降级，不覆盖为后续状态授权错误", async () => {
    const repository = {
      getStatus: vi.fn().mockResolvedValue({
        status: UserStatus.ENABLE,
        level: UserLevel.ADMIN,
      }),
      update: vi.fn(),
    };
    const cache = invalidator();

    await expect(
      updateUser(
        repository,
        {
          id: validUserId,
          level: UserLevel.EDITOR,
          status: UserStatus.DISABLE,
        },
        UserLevel.EDITOR,
        cache,
      ),
    ).rejects.toMatchObject({
      code: "PROTECTED_USER",
      message: "管理员账号不能降级",
    });
    expect(repository.update).not.toHaveBeenCalled();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it("状态读取找不到用户时不写入或失效缓存", async () => {
    const repository = {
      getStatus: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    };
    const cache = invalidator();

    await expect(
      updateUser(
        repository,
        { id: validUserId, status: UserStatus.DISABLE },
        UserLevel.ADMIN,
        cache,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "用户不存在" });
    expect(repository.update).not.toHaveBeenCalled();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it("不改变级别或状态时不读取账号状态", async () => {
    const repository = {
      getStatus: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: validUserId }),
    };
    const changes = { id: validUserId, name: "updated" };

    await updateUser(repository, changes, UserLevel.ADMIN, invalidator());

    expect(repository.getStatus).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledExactlyOnceWith(changes);
  });

  it("状态写入失败时原样抛错且不失效缓存", async () => {
    const failure = new Error("write failed");
    const repository = {
      getStatus: vi.fn().mockResolvedValue({
        status: UserStatus.ENABLE,
        level: UserLevel.EDITOR,
      }),
      update: vi.fn().mockRejectedValue(failure),
    };
    const cache = invalidator();

    await expect(
      updateUser(
        repository,
        { id: validUserId, status: UserStatus.DISABLE },
        UserLevel.ADMIN,
        cache,
      ),
    ).rejects.toBe(failure);
    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});
