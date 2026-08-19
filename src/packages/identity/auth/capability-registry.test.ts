import { describe, expect, it } from "vitest";

import {
  capabilityRegistry,
  getCapabilityDefinition,
  isCapability,
  registeredCapabilities,
} from "./capability-registry";
import { ALL_PERMISSIONS, Permission } from "./permissions";
import { actionGuardMatrix } from "@/app/admin/constants/admin-action-guard-matrix";
import { menu } from "@/app/admin/constants/menu-data";
import { capabilityProcedureMatrix } from "@/packages/trpc/api/capability-procedure-matrix-data";

describe("能力注册表", () => {
  it("完整覆盖权限定义且没有重复键", () => {
    expect(registeredCapabilities).toHaveLength(ALL_PERMISSIONS.length);
    expect(new Set(registeredCapabilities)).toEqual(new Set(ALL_PERMISSIONS));
    expect(Object.keys(capabilityRegistry)).toHaveLength(
      new Set(Object.keys(capabilityRegistry)).size,
    );
  });

  it("为每项能力声明至少一个生产入口类型", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(getCapabilityDefinition(permission).consumers.length).toBeGreaterThan(
        0,
      );
    }
  });

  it("拒绝未注册的能力字符串", () => {
    expect(isCapability(Permission.postReadAll)).toBe(true);
    expect(isCapability("postReadAll")).toBe(true);
    expect(isCapability("post:unknown")).toBe(false);
  });

  it("覆盖 tRPC、菜单和 Admin Action 的全部能力声明", () => {
    const permissions = [
      ...capabilityProcedureMatrix.map(([, permission]) => permission),
      ...actionGuardMatrix.flatMap((file) => file.actions.map((action) => action.permission)),
      ...menu.flatMap((item) => [item.permission, ...(item.children?.map((child) => child.permission) ?? [])]),
    ];
    expect(permissions.every((permission) => isCapability(permission))).toBe(true);
  });
});
