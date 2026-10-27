// @vitest-environment node

import { describe, expect, it } from "vitest";
import { Permission } from "@/lib/auth/permissions";
import { authorize } from "@/lib/auth/authorize";

describe("统一授权服务", () => {
  it("根据 capability 所需权限判断角色", () => {
    expect(
      authorize({ role: "ADMIN", permission: Permission.postUpdate }),
    ).toBe(true);
    expect(
      authorize({ role: "GUEST", permission: Permission.postUpdate }),
    ).toBe(false);
  });
});
