import { describe, expect, it } from "vitest";

import { Permission, can } from "@/packages/auth/permissions";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";

import { getMenuForCapabilities, menu } from "./menuData";

function paths(items: ReturnType<typeof getMenuForCapabilities>): string[] {
  return items.flatMap((item) => [item.path, ...paths(item.children ?? [])]);
}

describe("admin capability navigation", () => {
  it("declares a capability for every navigation entry", () => {
    const declared = menu.flatMap((item) => [
      item.permission,
      ...(item.children ?? []).map((child) => child.permission),
    ]);

    expect(declared.every(Boolean)).toBe(true);
  });

  it("filters navigation with the shared role capability matrix", () => {
    expect(paths(getMenuForCapabilities(UserLevel.ADMIN))).toContain(
      "/admin/setting",
    );
    expect(paths(getMenuForCapabilities(UserLevel.EDITOR))).not.toContain(
      "/admin/setting",
    );
    expect(paths(getMenuForCapabilities(UserLevel.EDITOR))).toContain(
      "/admin/post/edit",
    );
    expect(paths(getMenuForCapabilities(UserLevel.GUEST))).not.toContain(
      "/admin/post/edit",
    );
    expect(paths(getMenuForCapabilities(UserLevel.GUEST))).toContain(
      "/admin/post/list",
    );
    expect(paths(getMenuForCapabilities(undefined))).toEqual([]);
  });

  it("uses the server matrix permissions for representative entries", () => {
    const setting = menu.find((item) => item.path === "/admin/setting");
    const postCreate = menu
      .find((item) => item.path === "/admin/post")
      ?.children?.find((item) => item.path === "/admin/post/edit");

    expect(setting?.permission).toBe(Permission.settingUpdate);
    expect(postCreate?.permission).toBe(Permission.postCreate);
  });

  it.each([
    [
      UserLevel.ADMIN,
      [
        "/admin/dashboard",
        "/admin/post",
        "/admin/post/edit",
        "/admin/post/list",
        "/admin/post/category",
        "/admin/page",
        "/admin/page/edit",
        "/admin/page/list",
        "/admin/media",
        "/admin/menu",
        "/admin/tag",
        "/admin/comment",
        "/admin/user",
        "/admin/link",
        "/admin/setting",
      ],
    ],
    [
      UserLevel.EDITOR,
      [
        "/admin/dashboard",
        "/admin/post",
        "/admin/post/edit",
        "/admin/post/list",
        "/admin/post/category",
        "/admin/page",
        "/admin/page/edit",
        "/admin/page/list",
        "/admin/media",
        "/admin/menu",
        "/admin/tag",
        "/admin/comment",
        "/admin/user",
        "/admin/link",
      ],
    ],
    [
      UserLevel.GUEST,
      [
        "/admin/dashboard",
        "/admin/post",
        "/admin/post/list",
        "/admin/post/category",
        "/admin/page",
        "/admin/page/list",
        "/admin/media",
        "/admin/menu",
        "/admin/comment",
        "/admin/link",
      ],
    ],
  ])("matches the %s service capability matrix", (role, expectedPaths) => {
    expect(paths(getMenuForCapabilities(role))).toEqual(expectedPaths);
  });
});

const actionPermissions = [
  Permission.categoryCreate,
  Permission.categoryDelete,
  Permission.categoryUpdate,
  Permission.commentModerate,
  Permission.linkCreate,
  Permission.linkDelete,
  Permission.linkUpdate,
  Permission.mediaUpload,
  Permission.mediaDelete,
  Permission.menuUpdate,
  Permission.pageCreate,
  Permission.pageDelete,
  Permission.pageUpdate,
  Permission.postCreate,
  Permission.postDelete,
  Permission.postUpdate,
  Permission.postManageTags,
  Permission.settingUpdate,
  Permission.tagCreate,
  Permission.tagDelete,
  Permission.tagUpdate,
  Permission.userManage,
] as const;

describe("admin action capability visibility", () => {
  it.each([
    [UserLevel.ADMIN, actionPermissions],
    [
      UserLevel.EDITOR,
      [
        Permission.categoryCreate,
        Permission.categoryDelete,
        Permission.categoryUpdate,
        Permission.mediaUpload,
        Permission.mediaDelete,
        Permission.menuUpdate,
        Permission.pageCreate,
        Permission.pageDelete,
        Permission.pageUpdate,
        Permission.postCreate,
        Permission.postDelete,
        Permission.postUpdate,
        Permission.postManageTags,
        Permission.tagCreate,
        Permission.tagUpdate,
      ],
    ],
    [UserLevel.GUEST, []],
  ])("matches the %s service capability matrix", (role, expected) => {
    expect(
      actionPermissions.filter((permission) => can(role, permission)),
    ).toEqual(expected);
  });
});
