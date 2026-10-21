// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  assertNoLegacyAuthorization,
  loadProductionSources,
} from "@tests/helpers/capability-authorization-static";

describe("capability authorization static gate", () => {
  it("只加载非测试 TypeScript 生产源码", () => {
    const files = loadProductionSources().map(({ fileName }) => fileName);

    expect(files.some((file) => /\.test\.(ts|tsx)$/.test(file))).toBe(false);
    expect(files.every((file) => file.startsWith("src/"))).toBe(true);
  });

  it("contains no legacy procedure or business UserLevel authorization", () => {
    const productionSources = loadProductionSources();
    expect(productionSources.length).toBeGreaterThan(100);

    for (const { fileName, source } of productionSources) {
      expect(() => assertNoLegacyAuthorization(fileName, source)).not.toThrow();
    }
  }, 15_000);

  it.each([
    [
      "role-array procedure",
      `const route = protectedProcedure([UserLevel.ADMIN]).query(handler);`,
    ],
    [
      "direct role comparison",
      `if (ctx.user.level === UserLevel.ADMIN) return next();`,
    ],
    [
      "string role comparison",
      `if (ctx.user.level === "ADMIN") return next();`,
    ],
    [
      "role membership helper",
      `if ([UserLevel.ADMIN].includes(ctx.user.level)) return next();`,
    ],
    [
      "aliased current-user membership",
      `const current = ctx.user;
       const role = current.level;
       if ([UserLevel.ADMIN].includes(role)) return next();`,
    ],
    [
      "aliased legacy wrapper",
      `import { protectedProcedure as legacy } from "@/lib/trpc/core";
       const adminOnly = () => legacy([UserLevel.ADMIN]);
       const route = adminOnly().query(handler);`,
    ],
    [
      "namespace legacy wrapper",
      `import * as core from "./core";
       const legacy = core.protectedProcedure;
       const route = legacy([UserLevel.ADMIN]).query(handler);`,
    ],
    [
      "legacy export alias",
      `const legacy = (roles) => procedure.use(authorize(roles));
       export { legacy as protectedProcedure };`,
    ],
    [
      "legacy exported object definition",
      `export const authorization = {
         protectedProcedure: (roles) => procedure.use(authorize(roles)),
       };`,
    ],
    [
      "destructured session-user membership",
      `const { user: current } = session;
       const { level: role } = current;
       if (allowedRoles.has(role)) return next();`,
    ],
    [
      "assigned current-user role alias",
      `let role;
       role = ctx.user.level;
       if (allowedRoles.includes(role)) return next();`,
    ],
    [
      "current-user role reader wrapper",
      `const readRole = () => session.user.level;
       if (allowedRoles.has(readRole())) return next();`,
    ],
    [
      "generic role authorization helper",
      `function legacyRoleCheck(level, allowed) { return allowed.includes(level); }
       if (legacyRoleCheck(level, [UserLevel.ADMIN])) return next();`,
    ],
    [
      "user reader wrapper role comparison",
      `const readUser = () => repository.read();
       if (readUser().level === UserLevel.ADMIN) return next();`,
    ],
    [
      "imported and exported UserLevel aliases",
      `import { UserLevel as Role } from "@/features/user/user";
       const administrator = Role.ADMIN;
       export { administrator as privilegedRole };
       if (current === administrator) return next();`,
    ],
    [
      "current authority enum alias without role-named operands",
      `import { UserLevel as Tier } from "@/features/user/user";
       if (current === Tier.ADMIN) return next();`,
    ],
    [
      "non-identity UserLevel comparison",
      `const disabled = row.level === UserLevel.ADMIN;`,
    ],
    [
      "computed UserLevel membership",
      `const admins = new Set([UserLevel["ADMIN"]]);
       if (admins.has(ctx.user["level"])) return next();`,
    ],
  ])("fails closed if code restores %s authorization", (_case, source) => {
    expect(() => assertNoLegacyAuthorization("fixture.ts", source)).toThrow(
      /authorization|authorizes/i,
    );
  });

  it.each(["../user", "@/features/user/user"])(
    "resolves the UserLevel authority from %s",
    (specifier) => {
      expect(() =>
        assertNoLegacyAuthorization(
          "src/features/user/server/example.ts",
          `import { UserLevel as Tier } from "${specifier}"; if (current === Tier.ADMIN) return next();`,
        ),
      ).toThrow(/authorization/i);
    },
  );

  it("does not mistake an unrelated same-basename module for the UserLevel authority", () => {
    expect(() =>
      assertNoLegacyAuthorization(
        "src/features/other/example.ts",
        `import { UserLevel as Tier } from "./user"; if (current === Tier.ADMIN) return next();`,
      ),
    ).not.toThrow();
  });

  it("allows only the imported protected-account invariant at the repository write boundary", () => {
    const fileName = "src/features/user/server/user-repository.ts";
    const invariant = `import { assertUserLevelChange } from "../rules";
      assertUserLevelChange(id, current.level, next.level);`;
    expect(() =>
      assertNoLegacyAuthorization(fileName, invariant),
    ).not.toThrow();
    for (const source of [
      `${invariant} if (ctx.user.level === UserLevel.ADMIN) return next();`,
      `${invariant} if (allowedRoles.has(ctx.user.level)) return next();`,
      `${invariant} authorize(ctx.user.level);`,
      `${invariant} function shadow(assertUserLevelChange) { assertUserLevelChange(ctx.user.level); }`,
      `${invariant} function shadow() { const assertUserLevelChange = authorize; assertUserLevelChange(ctx.user.level); }`,
      `${invariant} function assertUserLevelChange(level) { return level; }`,
      `${invariant} other.assertUserLevelChange(ctx.user.level);`,
      `import { assertUserLevelChange } from "./untrusted"; assertUserLevelChange(id, current.level, next.level);`,
    ])
      expect(() => assertNoLegacyAuthorization(fileName, source)).toThrow();
    expect(() =>
      assertNoLegacyAuthorization("src/features/post/server.ts", invariant),
    ).toThrow();
  });

  it.each([
    `const label = UserLevelName[data.level];`,
    `const levels = records.map((data) => data.level);`,
    `const allowed = can(user.level, Permission.userManage);`,
  ])("allows non-identity level data usage", (source) => {
    expect(() =>
      assertNoLegacyAuthorization("fixture.tsx", source),
    ).not.toThrow();
  });
});
