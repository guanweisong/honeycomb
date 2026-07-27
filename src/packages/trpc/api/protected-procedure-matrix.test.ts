import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import * as ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemoryObservability } from "@/packages/observability/adapters/memory";
import { configureObservability } from "@/packages/observability/server/registry";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";

import { createTRPCRouter, protectedProcedure } from "./core";
import type { Context } from "./context";

const ALL_ROLES = [UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST] as const;
const ADMIN_EDITOR = [UserLevel.ADMIN, UserLevel.EDITOR] as const;
const ADMIN_ONLY = [UserLevel.ADMIN] as const;

type RoleMatrixEntry = readonly [string, readonly UserLevel[]];

interface RouterSource {
  routerName: string;
  fileName: string;
  source: string;
}

const roleOrder = new Map<UserLevel, number>(
  ALL_ROLES.map((role, index) => [role, index]),
);

function normalizeRoleMatrix(
  matrix: readonly RoleMatrixEntry[],
): RoleMatrixEntry[] {
  const seenPaths = new Set<string>();
  return matrix
    .map(([path, roles]) => {
      if (seenPaths.has(path)) {
        throw new Error(`Duplicate protected procedure path: ${path}`);
      }
      seenPaths.add(path);

      return [
        path,
        [...roles].sort(
          (left, right) => roleOrder.get(left)! - roleOrder.get(right)!,
        ),
      ] as const;
    })
    .sort(([left], [right]) => left.localeCompare(right));
}

function extractProtectedProcedureRoleMatrix(
  routerSources: readonly RouterSource[],
): RoleMatrixEntry[] {
  const entries: RoleMatrixEntry[] = [];

  for (const routerSource of routerSources) {
    const sourceFile = ts.createSourceFile(
      routerSource.fileName,
      routerSource.source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const routerObjects = findRouterObjects(sourceFile, routerSource.fileName);

    if (routerObjects.length !== 1) {
      throw new Error(
        `${routerSource.fileName} must declare exactly one createTRPCRouter object`,
      );
    }

    for (const property of routerObjects[0].properties) {
      if (!ts.isPropertyAssignment(property)) continue;

      const protectedCall = findProtectedProcedureCall(property.initializer);
      if (!protectedCall) continue;

      const procedureName = readProcedureName(property.name, routerSource.fileName);
      const roles = readProtectedRoles(
        protectedCall,
        routerSource.fileName,
        procedureName,
      );
      entries.push([
        `${routerSource.routerName}.${procedureName}`,
        roles,
      ]);
    }
  }

  return normalizeRoleMatrix(entries);
}

function findRouterObjects(
  sourceFile: ts.SourceFile,
  fileName: string,
): ts.ObjectLiteralExpression[] {
  const routerObjects: ts.ObjectLiteralExpression[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "createTRPCRouter"
    ) {
      const [routerObject] = node.arguments;
      if (!routerObject || !ts.isObjectLiteralExpression(routerObject)) {
        throw new Error(`${fileName} must pass an object to createTRPCRouter`);
      }
      routerObjects.push(routerObject);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return routerObjects;
}

function findProtectedProcedureCall(
  initializer: ts.Expression,
): ts.CallExpression | undefined {
  let current: ts.Expression = initializer;

  while (ts.isCallExpression(current)) {
    if (
      ts.isIdentifier(current.expression) &&
      current.expression.text === "protectedProcedure"
    ) {
      return current;
    }

    if (!ts.isPropertyAccessExpression(current.expression)) return undefined;
    current = current.expression.expression;
  }

  return undefined;
}

function readProcedureName(name: ts.PropertyName, fileName: string): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  throw new Error(`${fileName} uses an unsupported protected procedure name`);
}

function readProtectedRoles(
  protectedCall: ts.CallExpression,
  fileName: string,
  procedureName: string,
): UserLevel[] {
  const [rolesArgument] = protectedCall.arguments;
  if (!rolesArgument || !ts.isArrayLiteralExpression(rolesArgument)) {
    throw new Error(
      `${fileName}:${procedureName} must use a literal protected role array`,
    );
  }

  const roles = rolesArgument.elements.map((element) => {
    if (
      !ts.isPropertyAccessExpression(element) ||
      !ts.isIdentifier(element.expression) ||
      element.expression.text !== "UserLevel"
    ) {
      throw new Error(
        `${fileName}:${procedureName} contains a non-UserLevel role`,
      );
    }

    const role = UserLevel[element.name.text as keyof typeof UserLevel];
    if (!role) {
      throw new Error(
        `${fileName}:${procedureName} contains unknown role ${element.name.text}`,
      );
    }
    return role;
  });

  if (new Set(roles).size !== roles.length) {
    throw new Error(`${fileName}:${procedureName} contains duplicate roles`);
  }
  return roles;
}

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

  it("matches the protected role declarations in every real router", () => {
    const modulesDirectory = join(
      process.cwd(),
      "src/packages/trpc/api/modules",
    );
    const routerSources = readdirSync(modulesDirectory, {
      withFileTypes: true,
    }).flatMap((directory) => {
      if (!directory.isDirectory()) return [];

      const moduleDirectory = join(modulesDirectory, directory.name);
      return readdirSync(moduleDirectory)
        .filter((fileName) => fileName.endsWith(".router.ts"))
        .map((fileName) => ({
          routerName: fileName.slice(0, -".router.ts".length),
          fileName,
          source: readFileSync(join(moduleDirectory, fileName), "utf8"),
        }));
    });

    expect(extractProtectedProcedureRoleMatrix(routerSources)).toEqual(
      normalizeRoleMatrix(protectedProcedureRoleMatrix),
    );
  });

  it.each([
    [
      "addition",
      `export const sampleRouter = createTRPCRouter({
        read: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR]).query(() => null),
        update: protectedProcedure([UserLevel.ADMIN]).input(schema).mutation(() => null),
        create: protectedProcedure([UserLevel.ADMIN]).mutation(() => null),
      });`,
    ],
    [
      "deletion",
      `export const sampleRouter = createTRPCRouter({
        update: protectedProcedure([UserLevel.ADMIN]).input(schema).mutation(() => null),
      });`,
    ],
    [
      "rename",
      `export const sampleRouter = createTRPCRouter({
        list: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR]).query(() => null),
        update: protectedProcedure([UserLevel.ADMIN]).input(schema).mutation(() => null),
      });`,
    ],
    [
      "role change",
      `export const sampleRouter = createTRPCRouter({
        read: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR]).query(() => null),
        update: protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR]).input(schema).mutation(() => null),
      });`,
    ],
  ])("detects a protected declaration %s", (_change, source) => {
    const fixtureBaseline: readonly RoleMatrixEntry[] = [
      ["sample.read", ADMIN_EDITOR],
      ["sample.update", ADMIN_ONLY],
    ];

    expect(extractProtectedProcedureRoleMatrix([
      { routerName: "sample", fileName: "sample.router.ts", source },
    ])).not.toEqual(normalizeRoleMatrix(fixtureBaseline));
  });

  it.each(protectedProcedureRoleMatrix)(
    "%s preserves its current allowed and denied roles",
    async (path, allowedRoles) => {
      const expectedRoles: readonly UserLevel[] = allowedRoles;
      configureObservability(createMemoryObservability());
      const handler = vi.fn(() => "handled");
      const router = createTRPCRouter({
        [path]: protectedProcedure([...expectedRoles]).query(handler),
      });

      for (const level of ALL_ROLES) {
        const caller = router.createCaller(createContext(level)) as Record<
          string,
          () => Promise<string>
        >;
        const call = caller[path]();
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
