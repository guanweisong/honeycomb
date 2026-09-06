import { describe, expect, it } from "vitest";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { DomainError } from "@/packages/domain/core/domain-error";
import { UserAggregate } from "./user";

describe("UserAggregate", () => {
  it("变更账号状态", () => {
    const user = UserAggregate.rehydrate("user-1", UserStatus.ENABLE, UserLevel.EDITOR);
    user.changeStatus(UserStatus.DISABLE, UserLevel.ADMIN);
    expect(user.currentStatus).toBe(UserStatus.DISABLE);
  });

  it("保护管理员账号", () => {
    const user = UserAggregate.rehydrate("user-1", UserStatus.ENABLE, UserLevel.ADMIN);
    expect(() => user.changeStatus(UserStatus.DISABLE, UserLevel.EDITOR)).toThrow(DomainError);
  });

  it("允许管理员修改管理员账号状态", () => {
    const user = UserAggregate.rehydrate(
      "user-1",
      UserStatus.ENABLE,
      UserLevel.ADMIN,
    );

    user.changeStatus(UserStatus.DISABLE, UserLevel.ADMIN);

    expect(user.currentStatus).toBe(UserStatus.DISABLE);
  });

  it("禁止删除或降级受保护的管理员账号", () => {
    const user = UserAggregate.rehydrate(
      "user-1",
      UserStatus.ENABLE,
      UserLevel.ADMIN,
    );

    expect(() => user.assertDeletable()).toThrow(DomainError);
    expect(() => user.changeLevel(UserLevel.EDITOR)).toThrow(DomainError);
  });

  it("允许删除和调整普通账号等级", () => {
    const user = UserAggregate.rehydrate(
      "user-1",
      UserStatus.ENABLE,
      UserLevel.EDITOR,
    );

    expect(() => user.assertDeletable()).not.toThrow();
    user.changeLevel(UserLevel.GUEST);

    expect(user.currentLevel).toBe(UserLevel.GUEST);
  });
});
