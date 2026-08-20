import { describe, expect, it } from "vitest";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { DomainError } from "@/packages/domain/core/domain-error";
import { UserAggregate } from "./user";

describe("UserAggregate", () => {
  it("变更账号状态并发布领域事件", () => {
    const user = UserAggregate.rehydrate("user-1", UserStatus.ENABLE, UserLevel.EDITOR);
    user.changeStatus(UserStatus.DISABLE, UserLevel.ADMIN);
    expect(user.currentStatus).toBe(UserStatus.DISABLE);
    expect(user.pullEvents()[0]).toMatchObject({ name: "user.status-changed" });
  });

  it("保护管理员账号", () => {
    const user = UserAggregate.rehydrate("user-1", UserStatus.ENABLE, UserLevel.ADMIN);
    expect(() => user.changeStatus(UserStatus.DISABLE, UserLevel.EDITOR)).toThrow(DomainError);
  });
});
