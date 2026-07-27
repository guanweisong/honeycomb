import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemoryObservability } from "@/packages/observability/adapters/memory";
import { configureObservability } from "@/packages/observability/server/registry";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";

import { createTRPCRouter, protectedProcedure } from "./core";
import type { Context } from "./context";

const ALL_ROLES = [UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST] as const;
const ADMIN_EDITOR = [UserLevel.ADMIN, UserLevel.EDITOR] as const;
const ADMIN_ONLY = [UserLevel.ADMIN] as const;

const protectedProcedureRoleMatrix = [
  ["category.adminIndex", ALL_ROLES],
  ["category.create", ADMIN_EDITOR],
  ["category.destroy", ADMIN_EDITOR],
  ["category.update", ADMIN_EDITOR],
  ["comment.index", ALL_ROLES],
  ["comment.update", ADMIN_ONLY],
  ["comment.destroy", ADMIN_ONLY],
  ["link.adminIndex", ALL_ROLES],
  ["link.create", ADMIN_ONLY],
  ["link.destroy", ADMIN_ONLY],
  ["link.update", ADMIN_ONLY],
  ["media.index", ALL_ROLES],
  ["media.getPresignedUrl", ADMIN_EDITOR],
  ["media.upload", ADMIN_EDITOR],
  ["media.destroy", ADMIN_EDITOR],
  ["menu.adminIndex", ALL_ROLES],
  ["menu.saveAll", ADMIN_EDITOR],
  ["page.adminIndex", ALL_ROLES],
  ["page.adminDetail", ALL_ROLES],
  ["page.create", ADMIN_EDITOR],
  ["page.destroy", ADMIN_EDITOR],
  ["page.update", ADMIN_EDITOR],
  ["post.adminIndex", ALL_ROLES],
  ["post.adminDetail", ALL_ROLES],
  ["post.create", ADMIN_EDITOR],
  ["post.destroy", ADMIN_EDITOR],
  ["post.update", ADMIN_EDITOR],
  ["post.updateTags", ADMIN_EDITOR],
  ["setting.update", ADMIN_ONLY],
  ["statistic.index", ALL_ROLES],
  ["tag.create", ADMIN_EDITOR],
  ["tag.destroy", ADMIN_ONLY],
  ["tag.update", ADMIN_EDITOR],
  ["user.current", ALL_ROLES],
  ["user.index", ADMIN_EDITOR],
  ["user.create", ADMIN_ONLY],
  ["user.destroy", ADMIN_ONLY],
  ["user.update", ADMIN_ONLY],
] as const;

function createContext(level: UserLevel): Context {
  return {
    db: {} as Context["db"],
    user: { id: "matrix-user", level },
    hasRequest: true,
    header: new Headers(),
    requestId: "req-role-matrix",
  };
}

describe("legacy protected procedure role matrix", () => {
  afterEach(() => configureObservability());

  it("enumerates all 38 currently protected procedures", () => {
    expect(protectedProcedureRoleMatrix).toHaveLength(38);
    expect(new Set(protectedProcedureRoleMatrix.map(([path]) => path)).size).toBe(
      38,
    );
  });

  it.each(protectedProcedureRoleMatrix)(
    "%s preserves its current allowed and denied roles",
    async (_path, allowedRoles) => {
      const expectedRoles: readonly UserLevel[] = allowedRoles;
      configureObservability(createMemoryObservability());
      const handler = vi.fn(() => "handled");
      const router = createTRPCRouter({
        check: protectedProcedure([...expectedRoles]).query(handler),
      });

      for (const level of ALL_ROLES) {
        const call = router.createCaller(createContext(level)).check();
        if (expectedRoles.includes(level)) {
          await expect(call).resolves.toBe("handled");
        } else {
          await expect(call).rejects.toMatchObject({ code: "FORBIDDEN" });
        }
      }

      expect(handler).toHaveBeenCalledTimes(expectedRoles.length);
    },
  );
});
