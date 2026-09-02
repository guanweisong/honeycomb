import { describe, expect, it, vi } from "vitest";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { changeUserStatus } from "./application/user-command-handlers";
import { updateUser } from "./application/user-commands";

describe("User command handlers", () => {
  it("账号状态变更成功后派发事件", async () => {
    const update = vi.fn().mockResolvedValue({ id: "user-1", status: UserStatus.DISABLE });
    const bus = new InProcessEventBus();
    const handler = vi.fn();
    bus.subscribe("user.status-changed", handler);
    await changeUserStatus({ update } as never, { id: "user-1", currentStatus: UserStatus.ENABLE, status: UserStatus.DISABLE, level: UserLevel.EDITOR, actorLevel: UserLevel.ADMIN }, bus);
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
      { getStatus, update } as never,
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
        { getStatus, update } as never,
        { id: "user-1", status: UserStatus.DISABLE },
        UserLevel.EDITOR,
      ),
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });
});
