import { describe, expect, it } from "vitest";
import {
  existsSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import nextConfig from "../next.config";

import { actionGuardMatrix } from "@/app/admin/constants/admin-action-guard-matrix";
import { menu } from "@/app/admin/constants/menu-data";
import { capabilityProcedureMatrix } from "@/packages/trpc/api/capability-procedure-matrix-data";
import { isCapability } from "@/packages/identity/auth/capability-registry";

const adminRoot = join(process.cwd(), "src/app/admin");
const publicAdminPages = [
  "page.tsx", // Redirect-only entry point.
  "(root)/login/page.tsx",
  "(root)/forbidden/page.tsx",
];

const pageExtensions = nextConfig.pageExtensions ?? ["tsx", "ts", "jsx", "js"];

function routeFiles(directory: string, extensions = pageExtensions): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path, extensions);
    return extensions.some((extension) => entry.name === `page.${extension}`)
      ? [path]
      : [];
  });
}

describe("授权入口边界", () => {
  it("uses configured page extensions rather than treating every source file as a page", () => {
    const fixture = mkdtempSync(join(tmpdir(), "honeycomb-admin-extensions-"));
    try {
      for (const name of ["page.mdx", "page.tsx", "page.test.tsx"])
        writeFileSync(join(fixture, name), "fixture");
      expect(
        routeFiles(fixture, ["mdx"]).map((path) => relative(fixture, path)),
      ).toEqual(["page.mdx"]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
  it.each(["js", "jsx", "ts", "tsx"])(
    "发现未受保护的 page.%s 路由",
    (extension) => {
      const fixture = mkdtempSync(join(tmpdir(), "honeycomb-admin-routes-"));
      try {
        mkdirSync(join(fixture, "rogue"));
        writeFileSync(
          join(fixture, "rogue", `page.${extension}`),
          "export default function Page() { return null; }",
        );
        expect(
          routeFiles(fixture).map((path) => relative(fixture, path)),
        ).toEqual([`rogue/page.${extension}`]);
      } finally {
        rmSync(fixture, { recursive: true, force: true });
      }
    },
  );
  it("所有矩阵和菜单能力都来自注册表", () => {
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

    expect(permissions.every((permission) => isCapability(permission))).toBe(
      true,
    );
  });

  it("所有 Admin 页面都位于统一的服务端认证边界下", () => {
    const pages = routeFiles(adminRoot).map((path) =>
      relative(adminRoot, path),
    );
    expect(pages.length).toBeGreaterThan(0);
    expect(publicAdminPages.filter((page) => !pages.includes(page))).toEqual(
      [],
    );
    const unprotectedAdminPages = pages.filter(
      (page) =>
        !publicAdminPages.includes(page) &&
        !page.startsWith("(root)/(dashboard)/"),
    );
    expect(unprotectedAdminPages).toEqual([]);
    expect(existsSync(join(adminRoot, "(root)/(dashboard)/layout.tsx"))).toBe(
      true,
    );
    expect(
      existsSync(join(process.cwd(), "src/app/admin/lib/admin-auth.ts")),
    ).toBe(true);
  });
});
