import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { sourceFiles } from "@tests/helpers/source-files";
import { UserLevel } from "@/packages/domain/identity/user";
import {
  adminRouteCapabilities,
  canAccessAdminRoute,
  getAdminRoutePermission,
} from "./route-capabilities";

describe("Admin route capability registry", () => {
  it("登记所有受保护后台页面", () => {
    const root = join(process.cwd(), "src/app/admin/(root)/(dashboard)");
    const pages = sourceFiles(root)
      .filter((path) => path.endsWith("/page.tsx"))
      .map((path) => {
      const relative = path.slice(root.length).replace(/\/page\.tsx$/, "");
      return `/admin${relative.replace(/\/page$/, "")}`;
      });
    expect(pages.filter((path) => !adminRouteCapabilities[path as keyof typeof adminRouteCapabilities])).toEqual([]);
    expect(Object.keys(adminRouteCapabilities).every((path) => path === "/admin" || path.startsWith("/admin/"))).toBe(true);
  });

  it("使用登记的 capability 判定后台页面访问权限", () => {
    expect(getAdminRoutePermission("/admin/tag")).toBe("tag:create");
    expect(canAccessAdminRoute(UserLevel.EDITOR, "/admin/tag")).toBe(true);
    expect(canAccessAdminRoute(UserLevel.GUEST, "/admin/tag")).toBe(false);
  });

  it("默认拒绝未登记的后台页面", () => {
    expect(getAdminRoutePermission("/admin/unknown")).toBeUndefined();
    expect(canAccessAdminRoute(UserLevel.ADMIN, "/admin/unknown")).toBe(false);
  });
});
