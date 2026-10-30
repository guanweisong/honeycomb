// @vitest-environment node

import { describe, expect, it } from "vitest";
import { UserLevelName } from "@/features/user/types/user.level-name";
import { userLevelOptions, userStatusOptions } from "@/app/admin/(dashboard)/user/options";
import { UserStatusName } from "@/features/user/types/user.status-name";

describe("user display options", () => {
  it("preserves user level labels and option order", () => {
    expect(UserLevelName).toEqual({
      ADMIN: "管理员",
      EDITOR: "编辑",
      GUEST: "游客",
    });
    expect(userLevelOptions).toEqual([
      { label: "管理员", value: "ADMIN" },
      { label: "编辑", value: "EDITOR" },
      { label: "游客", value: "GUEST" },
    ]);
  });

  it("preserves the distinct user status option order", () => {
    expect(UserStatusName).toEqual({
      DELETED: "已删除",
      ENABLE: "启用",
      DISABLE: "禁用",
    });
    expect(userStatusOptions).toEqual([
      { label: "已删除", value: "DELETED" },
      { label: "禁用", value: "DISABLE" },
      { label: "启用", value: "ENABLE" },
    ]);
  });
});
