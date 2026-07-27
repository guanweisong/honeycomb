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
  moduleSpecifier: string;
  fileName: string;
  source: string;
}

interface RouterDeclaration {
  exportSymbol: string;
  routerObject: ts.ObjectLiteralExpression;
}

interface RouterImport {
  moduleSpecifier: string;
  importedSymbol: string;
  localSymbol: string;
}

interface RouterRegistration {
  registrationKey: string;
  localSymbol: string;
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
  appRouterSource: string,
): RoleMatrixEntry[] {
  const appSourceFile = ts.createSourceFile(
    "appRouter.ts",
    appRouterSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const routerImports = readRouterImports(appSourceFile);
  const appDeclaration = findRouterDeclaration(appSourceFile, "appRouter.ts");
  const registrations = readRouterRegistrations(
    appDeclaration.routerObject,
    "appRouter.ts",
  );
  validateRouterRegistrationBoundary(
    routerSources,
    routerImports,
    registrations,
  );

  const entries: RoleMatrixEntry[] = [];

  for (const routerSource of routerSources) {
    const sourceFile = ts.createSourceFile(
      routerSource.fileName,
      routerSource.source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const routerDeclaration = findRouterDeclaration(
      sourceFile,
      routerSource.fileName,
    );
    const registrationKey = resolveRegistrationKey(
      routerSource,
      routerDeclaration.exportSymbol,
      routerImports,
      registrations,
    );
    const protectedCalls = findAllProtectedProcedureCalls(sourceFile);
    const consumedCalls = new Map<ts.CallExpression, number>();

    for (const property of routerDeclaration.routerObject.properties) {
      if (!ts.isPropertyAssignment(property)) continue;

      const protectedCall = findProtectedProcedureCall(property.initializer);
      if (!protectedCall) continue;
      consumedCalls.set(
        protectedCall,
        (consumedCalls.get(protectedCall) ?? 0) + 1,
      );

      const procedureName = readProcedureName(property.name, routerSource.fileName);
      const roles = readProtectedRoles(
        protectedCall,
        routerSource.fileName,
        procedureName,
      );
      entries.push([
        `${registrationKey}.${procedureName}`,
        roles,
      ]);
    }

    for (const protectedCall of protectedCalls) {
      const consumptionCount = consumedCalls.get(protectedCall) ?? 0;
      if (consumptionCount === 0) {
        throw new Error(
          `${routerSource.fileName} contains an unconsumed protectedProcedure call`,
        );
      }
      if (consumptionCount !== 1) {
        throw new Error(
          `${routerSource.fileName} maps a protectedProcedure call more than once`,
        );
      }
    }
  }

  return normalizeRoleMatrix(entries);
}

function findRouterDeclaration(
  sourceFile: ts.SourceFile,
  fileName: string,
): RouterDeclaration {
  const declarations: RouterDeclaration[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "createTRPCRouter"
    ) {
      const [routerObject] = node.initializer.arguments;
      if (!routerObject || !ts.isObjectLiteralExpression(routerObject)) {
        throw new Error(`${fileName} must pass an object to createTRPCRouter`);
      }
      declarations.push({
        exportSymbol: node.name.text,
        routerObject,
      });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  if (declarations.length !== 1) {
    throw new Error(
      `${fileName} must declare exactly one createTRPCRouter variable`,
    );
  }
  return declarations[0];
}

function findAllProtectedProcedureCalls(
  sourceFile: ts.SourceFile,
): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "protectedProcedure"
    ) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
}

function readRouterImports(sourceFile: ts.SourceFile): RouterImport[] {
  return sourceFile.statements.flatMap((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.endsWith(".router") ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      return [];
    }

    const moduleSpecifier = statement.moduleSpecifier.text;
    return statement.importClause.namedBindings.elements.map((element) => ({
      moduleSpecifier,
      importedSymbol: element.propertyName?.text ?? element.name.text,
      localSymbol: element.name.text,
    }));
  });
}

function readRouterRegistrations(
  routerObject: ts.ObjectLiteralExpression,
  fileName: string,
): RouterRegistration[] {
  return routerObject.properties.map((property) => {
    if (
      !ts.isPropertyAssignment(property) ||
      !ts.isIdentifier(property.initializer)
    ) {
      throw new Error(`${fileName} contains a dynamic router registration`);
    }
    return {
      registrationKey: readProcedureName(property.name, fileName),
      localSymbol: property.initializer.text,
    };
  });
}

function validateRouterRegistrationBoundary(
  routerSources: readonly RouterSource[],
  routerImports: readonly RouterImport[],
  registrations: readonly RouterRegistration[],
): void {
  const sourceModules = new Set(routerSources.map(({ moduleSpecifier }) => moduleSpecifier));
  if (sourceModules.size !== routerSources.length) {
    throw new Error("Router sources contain a duplicate module specifier");
  }

  const registrationKeys = registrations.map(({ registrationKey }) => registrationKey);
  if (new Set(registrationKeys).size !== registrationKeys.length) {
    throw new Error("appRouter contains a duplicate registration key");
  }

  for (const routerImport of routerImports) {
    if (!sourceModules.has(routerImport.moduleSpecifier)) {
      throw new Error(
        `Registered router import ${routerImport.localSymbol} has no source`,
      );
    }
    const matches = registrations.filter(
      ({ localSymbol }) => localSymbol === routerImport.localSymbol,
    );
    if (matches.length === 0) {
      throw new Error(
        `Router source ${routerImport.moduleSpecifier} is not registered`,
      );
    }
    if (matches.length > 1) {
      throw new Error(
        `Router ${routerImport.localSymbol} is registered more than once`,
      );
    }
  }

  for (const registration of registrations) {
    const matches = routerImports.filter(
      ({ localSymbol }) => localSymbol === registration.localSymbol,
    );
    if (matches.length !== 1) {
      throw new Error(
        `Registration ${registration.registrationKey} has no unique router import`,
      );
    }
  }
}

function resolveRegistrationKey(
  routerSource: RouterSource,
  exportSymbol: string,
  routerImports: readonly RouterImport[],
  registrations: readonly RouterRegistration[],
): string {
  const imports = routerImports.filter(
    ({ moduleSpecifier, importedSymbol }) =>
      moduleSpecifier === routerSource.moduleSpecifier &&
      importedSymbol === exportSymbol,
  );
  if (imports.length !== 1) {
    throw new Error(
      `Router source ${routerSource.moduleSpecifier} is not registered by export symbol`,
    );
  }

  const registration = registrations.find(
    ({ localSymbol }) => localSymbol === imports[0].localSymbol,
  );
  if (!registration) {
    throw new Error(
      `Router source ${routerSource.moduleSpecifier} is not registered in appRouter`,
    );
  }
  return registration.registrationKey;
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

const sampleRouterSource: RouterSource = {
  moduleSpecifier: "./sample.router",
  fileName: "sample.router.ts",
  source: `export const sampleRouter = createTRPCRouter({
    read: protectedProcedure([UserLevel.ADMIN]).query(() => null),
  });`,
};

const sampleAppRouterSource = `
  import { sampleRouter } from "./sample.router";
  export const appRouter = createTRPCRouter({
    sample: sampleRouter,
  });
`;

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
          moduleSpecifier: `@/packages/trpc/api/modules/${directory.name}/${fileName.slice(0, -3)}`,
          fileName,
          source: readFileSync(join(moduleDirectory, fileName), "utf8"),
        }));
    });
    const appRouterSource = readFileSync(
      join(process.cwd(), "src/packages/trpc/api/appRouter.ts"),
      "utf8",
    );

    expect(
      extractProtectedProcedureRoleMatrix(routerSources, appRouterSource),
    ).toEqual(normalizeRoleMatrix(protectedProcedureRoleMatrix));
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
      {
        moduleSpecifier: "./sample.router",
        fileName: "sample.router.ts",
        source,
      },
    ], sampleAppRouterSource)).not.toEqual(normalizeRoleMatrix(fixtureBaseline));
  });

  it.each([
    [
      "alias",
      `const adminProcedure = protectedProcedure([UserLevel.ADMIN]);
       export const sampleRouter = createTRPCRouter({
         read: adminProcedure.query(() => null),
       });`,
    ],
    [
      "shared builder",
      `const adminProcedure = protectedProcedure([UserLevel.ADMIN]);
       export const sampleRouter = createTRPCRouter({
         read: adminProcedure.query(() => null),
         update: adminProcedure.mutation(() => null),
       });`,
    ],
    [
      "wrapper",
      `const adminProcedure = () => protectedProcedure([UserLevel.ADMIN]);
       export const sampleRouter = createTRPCRouter({
         read: adminProcedure().query(() => null),
       });`,
    ],
  ])("fails closed for an unconsumed protectedProcedure %s", (_case, source) => {
    expect(() => extractProtectedProcedureRoleMatrix([
      {
        moduleSpecifier: "./sample.router",
        fileName: "sample.router.ts",
        source,
      },
    ], sampleAppRouterSource)).toThrow(/unconsumed protectedProcedure/i);
  });

  it("exposes an appRouter registration rename to the baseline comparison", () => {
    const renamedMatrix = extractProtectedProcedureRoleMatrix(
      [sampleRouterSource],
      sampleAppRouterSource.replace("sample: sampleRouter", "renamed: sampleRouter"),
    );

    expect(renamedMatrix).toEqual([["renamed.read", [UserLevel.ADMIN]]]);
    expect(renamedMatrix).not.toEqual([["sample.read", [UserLevel.ADMIN]]]);
  });

  it("fails when appRouter still registers a removed router source", () => {
    expect(() => extractProtectedProcedureRoleMatrix(
      [],
      sampleAppRouterSource,
    )).toThrow(/registered router.*source/i);
  });

  it("fails when appRouter registers the same router more than once", () => {
    expect(() => extractProtectedProcedureRoleMatrix(
      [sampleRouterSource],
      sampleAppRouterSource.replace(
        "sample: sampleRouter",
        "sample: sampleRouter, duplicate: sampleRouter",
      ),
    )).toThrow(/registered.*more than once/i);
  });

  it("fails when a router source is not registered in appRouter", () => {
    expect(() => extractProtectedProcedureRoleMatrix(
      [sampleRouterSource],
      sampleAppRouterSource.replace("sample: sampleRouter", ""),
    )).toThrow(/router source.*not registered/i);
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
