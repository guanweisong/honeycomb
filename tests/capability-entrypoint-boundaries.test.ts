import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { actionGuardMatrix } from "@/app/admin/constants/admin-action-guard-matrix";
import { menu } from "@/app/admin/constants/menu-data";
import { capabilityProcedureMatrix } from "@/packages/trpc/api/capability-procedure-matrix-data";
import { isCapability } from "@/packages/identity/auth/capability-registry";

const adminRoot = join(process.cwd(), "src/app/admin");

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

describe("授权入口边界", () => {
  it("所有矩阵和菜单能力都来自注册表", () => {
    const permissions = [
      ...capabilityProcedureMatrix.map(([, permission]) => permission),
      ...actionGuardMatrix.flatMap((file) => file.actions.map((action) => action.permission)),
      ...menu.flatMap((item) => [item.permission, ...(item.children?.map((child) => child.permission) ?? [])]),
    ];

    expect(permissions.every((permission) => isCapability(permission))).toBe(true);
  });

  it("所有 Admin 页面都位于统一的服务端认证边界下", () => {
    const pages = routeFiles(adminRoot).map((path) => relative(process.cwd(), path));
    expect(pages.length).toBeGreaterThan(0);
    expect(existsSync(join(process.cwd(), "src/app/admin/layout.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/app/admin/lib/admin-auth.ts"))).toBe(true);
  });
});
