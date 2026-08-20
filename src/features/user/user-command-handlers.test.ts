import { describe, expect, it, vi } from "vitest";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { changeUserStatus } from "./user-command-handlers";

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
});
