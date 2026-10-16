import { describe, expect, it, vi } from "vitest";
import { ApplicationError } from "@/packages/application/errors";
import { getCurrentUser, UserQueryError } from "./user-queries";

describe("Current user error mapping", () => {
  it("将应用层未授权错误映射为当前用户查询错误", async () => {
    const repository = {
      current: vi
        .fn()
        .mockRejectedValue(
          new ApplicationError("UNAUTHORIZED", "session expired"),
        ),
    };

    await expect(getCurrentUser(repository, "user-1")).rejects.toBeInstanceOf(
      UserQueryError,
    );
  });

  it.each([
    new ApplicationError("NOT_FOUND", "not found"),
    new Error("database unavailable"),
  ])("不改变其他错误 $message", async (failure) => {
    const repository = { current: vi.fn().mockRejectedValue(failure) };

    await expect(getCurrentUser(repository, "user-1")).rejects.toBe(failure);
  });
});
