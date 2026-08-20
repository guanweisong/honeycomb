import { describe, expect, it } from "vitest";
import { assertNoLegacyAuthorization, loadProductionSources } from "./capability-authorization-static";

describe("capability authorization static gate", () => {
  it("只加载非测试 TypeScript 源码并排除授权测试工具自身", () => {
    const files = loadProductionSources().map(({ fileName }) => fileName);

    expect(files.some((file) => /\.test\.(ts|tsx)$/.test(file))).toBe(false);
    expect(files).not.toContain(
      "src/packages/trpc/api/capability-authorization-static.ts",
    );
    expect(files).not.toContain(
      "src/packages/trpc/api/capability-authorization-sources.ts",
    );
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
      `import { protectedProcedure as legacy } from "@/packages/trpc/api/core";
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
      `import { UserLevel as Role } from "./user.level";
       const administrator = Role.ADMIN;
       export { administrator as privilegedRole };
       if (account.level === administrator) return next();`,
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
