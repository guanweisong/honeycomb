import { describe, expect, it } from "vitest";

import { capabilityRegistry } from "@tests/helpers/capability-consumers";
import {
  ALL_PERMISSIONS,
  Permission,
  isPermission,
} from "@/lib/auth/permissions";
import { actionGuardMatrix } from "@tests/helpers/admin-action-guard-matrix";
import { menu } from "@/app/admin/constants/menu-data";
import { capabilityProcedureMatrix } from "@tests/helpers/capability-procedure-matrix-data";

describe("能力注册表", () => {
  it("完整覆盖权限定义且没有重复键", () => {
    const registeredCapabilities = Object.keys(capabilityRegistry);
    expect(registeredCapabilities).toHaveLength(ALL_PERMISSIONS.length);
    expect(new Set(registeredCapabilities)).toEqual(new Set(ALL_PERMISSIONS));
    expect(Object.keys(capabilityRegistry)).toHaveLength(
      new Set(Object.keys(capabilityRegistry)).size,
    );
  });

  it("为每项能力声明至少一个生产入口类型", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(capabilityRegistry[permission].consumers.length).toBeGreaterThan(
        0,
      );
    }
  });

  it("拒绝未注册的能力字符串", () => {
    expect(isPermission(Permission.postReadAll)).toBe(true);
    expect(isPermission("postReadAll")).toBe(false);
    expect(isPermission("post:unknown")).toBe(false);
    expect(isPermission("__proto__")).toBe(false);
    expect(isPermission("constructor")).toBe(false);
    expect(isPermission("toString")).toBe(false);
  });

  it("覆盖 tRPC、菜单和 Admin Action 的全部能力声明", () => {
    const permissions = [
      ...capabilityProcedureMatrix.map(([, permission]) => permission),
      ...actionGuardMatrix.flatMap((file) =>
        file.actions.map((action) => action.permission),
      ),
      ...menu.flatMap((item) => [
        item.permission,
        ...(item.children?.map((child) => child.permission) ?? []),
      ]),
    ];
    expect(permissions.every((permission) => isPermission(permission))).toBe(
      true,
    );
  });
});
