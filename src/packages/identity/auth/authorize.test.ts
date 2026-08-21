import { describe, expect, it } from "vitest";
import { Permission } from "./permissions";
import { authorize } from "./authorize";

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
