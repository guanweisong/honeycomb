import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { adminRouteCapabilities } from "./route-capabilities";

function pageFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pageFiles(path);
    return entry === "page.tsx" ? [path] : [];
  });
}

describe("Admin route capability registry", () => {
  it("登记所有受保护后台页面", () => {
    const root = join(process.cwd(), "src/app/admin/(root)/(dashboard)");
    const pages = pageFiles(root).map((path) => {
      const relative = path.slice(root.length).replace(/\/page\.tsx$/, "");
      return `/admin${relative.replace(/\/page$/, "")}`;
    });
    expect(pages.filter((path) => !adminRouteCapabilities[path as keyof typeof adminRouteCapabilities])).toEqual([]);
    expect(Object.keys(adminRouteCapabilities).every((path) => path === "/admin" || path.startsWith("/admin/"))).toBe(true);
  });
});
