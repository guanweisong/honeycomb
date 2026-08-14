import { describe, expect, it } from "vitest";

import { Permission, can } from "@/packages/identity/auth/permissions";
import { UserLevel } from "@/packages/domain/identity/user";
import { UserStatus } from "@/packages/domain/identity/user";
import type { UserEntity } from "@/packages/trpc/api/outputs";

import {
  buildUserUpdateInput,
  canDeleteUserResource,
  isUserResourceProtected,
  toUserFormDefaults,
} from "./userTransforms";

const admin = {
  id: "admin-1",
  name: null,
  email: null,
  level: UserLevel.ADMIN,
  status: UserStatus.ENABLE,
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: null,
} as UserEntity;

const editor = {
  ...admin,
  id: "editor-1",
  name: "Editor",
  email: "editor@example.test",
  level: UserLevel.EDITOR,
} as UserEntity;

describe("user transforms", () => {
  it("maps safe list DTO fields to edit defaults without inventing values", () => {
    expect(toUserFormDefaults(undefined)).toBeUndefined();
    expect(toUserFormDefaults(admin)).toEqual({
      id: "admin-1",
      name: undefined,
      email: undefined,
      level: UserLevel.ADMIN,
      status: UserStatus.ENABLE,
    });
  });

  it("forces update payloads to use the selected target id", () => {
    expect(
      buildUserUpdateInput(editor, {
        id: "forged-id",
        name: "Updated Editor",
        status: UserStatus.DISABLE,
      }),
    ).toEqual({
      id: "editor-1",
      name: "Updated Editor",
      status: UserStatus.DISABLE,
    });
  });

  it("uses the capability model to protect privileged target resources", () => {
    expect(isUserResourceProtected(admin)).toBe(true);
    expect(isUserResourceProtected(editor)).toBe(false);
    expect(can(admin.level, Permission.userManage)).toBe(true);
    expect(canDeleteUserResource(admin)).toBe(false);
    expect(canDeleteUserResource(editor)).toBe(true);
    expect(
      canDeleteUserResource({ ...editor, status: UserStatus.DELETED }),
    ).toBe(false);
  });
});
