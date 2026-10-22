// @vitest-environment node

import { describe, expect, it } from "vitest";
import { UserLevel } from "@/features/user/types/user.level";
import { DomainError } from "@/lib/errors/domain-error";
import {
  assertUserDeletable,
  assertUserLevelChange,
  assertUserStatusChange,
} from "./user-protection";

describe("protected account rules", () => {
  it("allows ordinary account deletion, level changes, and status changes", () => {
    expect(() => assertUserDeletable("user-1", UserLevel.EDITOR)).not.toThrow();
    expect(() =>
      assertUserLevelChange("user-1", UserLevel.EDITOR, UserLevel.GUEST),
    ).not.toThrow();
    expect(() =>
      assertUserStatusChange("user-1", UserLevel.EDITOR, UserLevel.EDITOR),
    ).not.toThrow();
  });

  it("rejects deleting or demoting an administrator", () => {
    expect(() => assertUserDeletable("admin-1", UserLevel.ADMIN)).toThrow(
      DomainError,
    );
    expect(() =>
      assertUserLevelChange("admin-1", UserLevel.ADMIN, UserLevel.EDITOR),
    ).toThrow("管理员账号不能降级");
    expect(() =>
      assertUserLevelChange("admin-1", UserLevel.ADMIN, UserLevel.ADMIN),
    ).not.toThrow();
  });

  it("only administrators can change an administrator's status", () => {
    expect(() =>
      assertUserStatusChange("admin-1", UserLevel.ADMIN, UserLevel.EDITOR),
    ).toThrow("非管理员不能修改管理员账号");
    expect(() =>
      assertUserStatusChange("admin-1", UserLevel.ADMIN, UserLevel.ADMIN),
    ).not.toThrow();
  });

  it.each(["", " ", "\t\n"])("preserves identity validation for %j", (id) => {
    expect(() => assertUserDeletable(id, UserLevel.EDITOR)).toThrow(
      "聚合标识不能为空",
    );
    expect(() =>
      assertUserLevelChange(id, UserLevel.EDITOR, UserLevel.ADMIN),
    ).toThrow("聚合标识不能为空");
    expect(() =>
      assertUserStatusChange(id, UserLevel.EDITOR, UserLevel.ADMIN),
    ).toThrow("聚合标识不能为空");
  });
});

it("validates nonblank identity without requiring an aggregate or normalizing it", async () => {
  const { assertNonBlankId } = await import("@/lib/validation/nonblank-id");
  expect(assertNonBlankId(" user-1 ")).toBeUndefined();
  expect(() => assertNonBlankId(" \t\n")).toThrow("聚合标识不能为空");
});
