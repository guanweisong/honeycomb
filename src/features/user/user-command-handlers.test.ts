import { describe, expect, it, vi } from "vitest";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { changeUserStatus } from "./application/user-command-handlers";
import { destroyUsers, updateUser } from "./application/user-commands";

describe("User command handlers", () => {
  it("账号状态变更成功后派发事件", async () => {
    const update = vi.fn().mockResolvedValue({ id: "user-1", status: UserStatus.DISABLE });
    const bus = new InProcessEventBus();
    const handler = vi.fn();
    bus.subscribe("user.status-changed", handler);
    await changeUserStatus({ update }, { id: "user-1", currentStatus: UserStatus.ENABLE, status: UserStatus.DISABLE, level: UserLevel.EDITOR, actorLevel: UserLevel.ADMIN }, bus);
    expect(update).toHaveBeenCalledWith({ id: "user-1", status: UserStatus.DISABLE });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("更新用户状态时必须先经过用户聚合", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      status: UserStatus.ENABLE,
      level: UserLevel.EDITOR,
    });
    const update = vi.fn().mockResolvedValue({ id: "user-1", status: UserStatus.DISABLE });

    await updateUser(
      { getStatus, update },
      { id: "user-1", status: UserStatus.DISABLE },
      UserLevel.ADMIN,
    );

    expect(getStatus).toHaveBeenCalledWith("user-1");
    expect(update).toHaveBeenCalledWith({ id: "user-1", status: UserStatus.DISABLE });
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
        { id: "user-1", status: UserStatus.DISABLE },
        UserLevel.EDITOR,
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
      destroyUsers({ destroy, getStates }, ["admin-1"]),
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

    await expect(
      destroyUsers({ destroy, getStates }, ["editor-1"]),
    ).resolves.toEqual({ success: true });
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
        { id: "admin-1", level: UserLevel.EDITOR },
        UserLevel.ADMIN,
      ),
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });
});
