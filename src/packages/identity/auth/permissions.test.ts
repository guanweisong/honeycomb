import { describe, expect, it } from "vitest";

import { UserLevel } from "@/packages/domain/identity/user";

import {
  ALL_PERMISSIONS,
  Permission,
  ROLE_PERMISSIONS,
  can,
} from "./permissions";

const expectedPermissions = [
  "category:read-all",
  "category:create",
  "category:delete",
  "category:update",
  "comment:read-all",
  "comment:moderate",
  "link:read-all",
  "link:create",
  "link:delete",
  "link:update",
  "media:read-all",
  "media:upload",
  "media:delete",
  "menu:read-all",
  "menu:update",
  "page:read-all",
  "page:create",
  "page:delete",
  "page:update",
  "post:read-all",
  "post:create",
  "post:delete",
  "post:update",
  "post:manage-tags",
  "setting:update",
  "statistics:read",
  "tag:create",
  "tag:delete",
  "tag:update",
  "user:read-self",
  "user:read-all",
  "user:manage",
] as const;

const expectedEditorPermissions = [
  "category:read-all",
  "category:create",
  "category:delete",
  "category:update",
  "comment:read-all",
  "link:read-all",
  "media:read-all",
  "media:upload",
  "media:delete",
  "menu:read-all",
  "menu:update",
  "page:read-all",
  "page:create",
  "page:delete",
  "page:update",
  "post:read-all",
  "post:create",
  "post:delete",
  "post:update",
  "post:manage-tags",
  "statistics:read",
  "tag:create",
  "tag:update",
  "user:read-self",
  "user:read-all",
] as const;

const expectedGuestPermissions = [
  "category:read-all",
  "comment:read-all",
  "link:read-all",
  "media:read-all",
  "menu:read-all",
  "page:read-all",
  "post:read-all",
  "statistics:read",
  "user:read-self",
] as const;

describe("capability authorization", () => {
  it("defines the complete stable business permission catalog", () => {
    expect(ALL_PERMISSIONS).toEqual(expectedPermissions);
    expect(Object.values(Permission)).toEqual(expectedPermissions);
  });

  it("keeps the role map exhaustive and grants ADMIN every permission", () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(
      Object.values(UserLevel).sort(),
    );
    expect(ROLE_PERMISSIONS[UserLevel.ADMIN]).toEqual(expectedPermissions);
  });

  it("locks the complete EDITOR capability snapshot", () => {
    expect(ROLE_PERMISSIONS[UserLevel.EDITOR]).toEqual(
      expectedEditorPermissions,
    );
  });

  it("locks the complete GUEST capability snapshot", () => {
    expect(ROLE_PERMISSIONS[UserLevel.GUEST]).toEqual(expectedGuestPermissions);
  });

  it("allows known grants and denies unknown roles, permissions, and omissions", () => {
    expect(can(UserLevel.EDITOR, Permission.postUpdate)).toBe(true);
    expect(can(UserLevel.EDITOR, Permission.userManage)).toBe(false);
    expect(can("OWNER", Permission.postUpdate)).toBe(false);
    expect(can(UserLevel.ADMIN, "future:permission")).toBe(false);
    expect(can(undefined, Permission.postUpdate)).toBe(false);
  });
});
