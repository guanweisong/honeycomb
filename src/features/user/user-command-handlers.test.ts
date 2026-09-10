import { describe, expect, it, vi } from "vitest";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { changeUserStatus } from "./application/user-command-handlers";
import {
  createUser,
  destroyUsers,
  updateUser,
} from "./application/user-commands";

const validUserId = "000000000000000000000001";
const invalidator = () => ({
  invalidateAll: vi.fn().mockResolvedValue(undefined),
});

describe("User command handlers", () => {
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

    await updateUser(
      { getStatus, update },
      { id: validUserId, status: UserStatus.DISABLE },
      UserLevel.ADMIN,
      invalidator(),
    );

    expect(getStatus).toHaveBeenCalledWith(validUserId);
    expect(update).toHaveBeenCalledWith({
      id: validUserId,
      status: UserStatus.DISABLE,
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
    ).resolves.toEqual({ success: true });
    expect(cache.invalidateAll).toHaveBeenCalledOnce();
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
