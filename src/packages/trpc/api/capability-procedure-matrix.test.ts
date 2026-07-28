import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import * as ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";

import {
  ALL_PERMISSIONS,
  Permission,
  type Permission as PermissionValue,
} from "@/packages/auth/permissions";
import { createMemoryObservability } from "@/packages/observability/adapters/memory";
import { configureObservability } from "@/packages/observability/server/registry";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";

import { createTRPCRouter, permissionProcedure } from "./core";
import type { Context } from "./context";

const ALL_ROLES = [UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST] as const;
const ADMIN_EDITOR = [UserLevel.ADMIN, UserLevel.EDITOR] as const;
const ADMIN_ONLY = [UserLevel.ADMIN] as const;

type CapabilityMatrixEntry = readonly [
  path: string,
  permission: PermissionValue,
  allowedRoles: readonly UserLevel[],
];
type DeclarationEntry = readonly [path: string, permission: PermissionValue];

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

function normalizeDeclarationMatrix(
  matrix: readonly DeclarationEntry[],
): DeclarationEntry[] {
  const seenPaths = new Set<string>();
  return matrix
    .map(([path, permission]) => {
      if (seenPaths.has(path)) {
        throw new Error(`Duplicate protected procedure path: ${path}`);
      }
      seenPaths.add(path);
      return [path, permission] as const;
    })
    .sort(([left], [right]) => left.localeCompare(right));
}

function extractCapabilityProcedureMatrix(
  routerSources: readonly RouterSource[],
  appRouterSource: string,
): DeclarationEntry[] {
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

  const entries: DeclarationEntry[] = [];

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
    const permissionCalls = findAllPermissionProcedureCalls(sourceFile);
    const consumedCalls = new Map<ts.CallExpression, number>();

    for (const property of routerDeclaration.routerObject.properties) {
      if (!ts.isPropertyAssignment(property)) continue;

      const permissionCall = findPermissionProcedureCall(property.initializer);
      if (!permissionCall) continue;
      consumedCalls.set(
        permissionCall,
        (consumedCalls.get(permissionCall) ?? 0) + 1,
      );

      const procedureName = readProcedureName(
        property.name,
        routerSource.fileName,
      );
      entries.push([
        `${registrationKey}.${procedureName}`,
        readPermission(permissionCall, routerSource.fileName, procedureName),
      ]);
    }

    for (const permissionCall of permissionCalls) {
      const consumptionCount = consumedCalls.get(permissionCall) ?? 0;
      if (consumptionCount === 0) {
        throw new Error(
          `${routerSource.fileName} contains an unconsumed permissionProcedure call`,
        );
      }
      if (consumptionCount !== 1) {
        throw new Error(
          `${routerSource.fileName} maps a permissionProcedure call more than once`,
        );
      }
    }
  }

  return normalizeDeclarationMatrix(entries);
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
      declarations.push({ exportSymbol: node.name.text, routerObject });
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

function isIdentifierCall(node: ts.CallExpression, name: string): boolean {
  return ts.isIdentifier(node.expression) && node.expression.text === name;
}

function findAllPermissionProcedureCalls(
  sourceFile: ts.SourceFile,
): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      isIdentifierCall(node, "permissionProcedure")
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
  const sourceModules = new Set(
    routerSources.map(({ moduleSpecifier }) => moduleSpecifier),
  );
  if (sourceModules.size !== routerSources.length) {
    throw new Error("Router sources contain a duplicate module specifier");
  }

  const registrationKeys = registrations.map(
    ({ registrationKey }) => registrationKey,
  );
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

function findPermissionProcedureCall(
  initializer: ts.Expression,
): ts.CallExpression | undefined {
  let current: ts.Expression = initializer;

  while (ts.isCallExpression(current)) {
    if (isIdentifierCall(current, "permissionProcedure")) return current;
    if (!ts.isPropertyAccessExpression(current.expression)) return undefined;
    current = current.expression.expression;
  }

  return undefined;
}

function readProcedureName(name: ts.PropertyName, fileName: string): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  throw new Error(`${fileName} uses an unsupported protected procedure name`);
}

function readPermission(
  permissionCall: ts.CallExpression,
  fileName: string,
  procedureName: string,
): PermissionValue {
  const [argument] = permissionCall.arguments;
  if (
    !argument ||
    !ts.isPropertyAccessExpression(argument) ||
    !ts.isIdentifier(argument.expression) ||
    argument.expression.text !== "Permission"
  ) {
    throw new Error(
      `${fileName}:${procedureName} must use a direct Permission member`,
    );
  }

  const permission = Permission[argument.name.text as keyof typeof Permission];
  if (!permission) {
    throw new Error(
      `${fileName}:${procedureName} contains unknown permission ${argument.name.text}`,
    );
  }
  return permission;
}

function containsLevelAccess(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (ts.isPropertyAccessExpression(child) && child.name.text === "level") {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function assertNoLegacyAuthorization(fileName: string, source: string): void {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "protectedProcedure") {
      throw new Error(
        `${fileName} restores protectedProcedure role authorization`,
      );
    }

    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ].includes(node.operatorToken.kind) &&
      containsLevelAccess(node)
    ) {
      throw new Error(
        `${fileName} compares a business UserLevel for authorization`,
      );
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "includes" &&
      node.arguments.some(containsLevelAccess)
    ) {
      throw new Error(`${fileName} authorizes through a role membership check`);
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

const capabilityProcedureMatrix: readonly CapabilityMatrixEntry[] = [
  ["category.adminIndex", Permission.categoryReadAll, ALL_ROLES],
  ["category.create", Permission.categoryCreate, ADMIN_EDITOR],
  ["category.destroy", Permission.categoryDelete, ADMIN_EDITOR],
  ["category.update", Permission.categoryUpdate, ADMIN_EDITOR],
  ["comment.index", Permission.commentReadAll, ALL_ROLES],
  ["comment.update", Permission.commentModerate, ADMIN_ONLY],
  ["comment.destroy", Permission.commentModerate, ADMIN_ONLY],
  ["link.adminIndex", Permission.linkReadAll, ALL_ROLES],
  ["link.create", Permission.linkCreate, ADMIN_ONLY],
  ["link.destroy", Permission.linkDelete, ADMIN_ONLY],
  ["link.update", Permission.linkUpdate, ADMIN_ONLY],
  ["media.index", Permission.mediaReadAll, ALL_ROLES],
  ["media.getPresignedUrl", Permission.mediaUpload, ADMIN_EDITOR],
  ["media.upload", Permission.mediaUpload, ADMIN_EDITOR],
  ["media.destroy", Permission.mediaDelete, ADMIN_EDITOR],
  ["menu.adminIndex", Permission.menuReadAll, ALL_ROLES],
  ["menu.saveAll", Permission.menuUpdate, ADMIN_EDITOR],
  ["page.adminIndex", Permission.pageReadAll, ALL_ROLES],
  ["page.adminDetail", Permission.pageReadAll, ALL_ROLES],
  ["page.create", Permission.pageCreate, ADMIN_EDITOR],
  ["page.destroy", Permission.pageDelete, ADMIN_EDITOR],
  ["page.update", Permission.pageUpdate, ADMIN_EDITOR],
  ["post.adminIndex", Permission.postReadAll, ALL_ROLES],
  ["post.adminDetail", Permission.postReadAll, ALL_ROLES],
  ["post.create", Permission.postCreate, ADMIN_EDITOR],
  ["post.destroy", Permission.postDelete, ADMIN_EDITOR],
  ["post.update", Permission.postUpdate, ADMIN_EDITOR],
  ["post.updateTags", Permission.postManageTags, ADMIN_EDITOR],
  ["setting.update", Permission.settingUpdate, ADMIN_ONLY],
  ["statistic.index", Permission.statisticsRead, ALL_ROLES],
  ["tag.create", Permission.tagCreate, ADMIN_EDITOR],
  ["tag.destroy", Permission.tagDelete, ADMIN_ONLY],
  ["tag.update", Permission.tagUpdate, ADMIN_EDITOR],
  ["user.current", Permission.userReadSelf, ALL_ROLES],
  ["user.index", Permission.userReadAll, ADMIN_EDITOR],
  ["user.create", Permission.userManage, ADMIN_ONLY],
  ["user.destroy", Permission.userManage, ADMIN_ONLY],
  ["user.update", Permission.userManage, ADMIN_ONLY],
];

const sampleRouterSource: RouterSource = {
  moduleSpecifier: "./sample.router",
  fileName: "sample.router.ts",
  source: `export const sampleRouter = createTRPCRouter({
    read: permissionProcedure(Permission.postReadAll).query(() => null),
  });`,
};

const sampleAppRouterSource = `
  import { sampleRouter } from "./sample.router";
  export const appRouter = createTRPCRouter({
    sample: sampleRouter,
  });
`;

function loadRouterSources(): RouterSource[] {
  const modulesDirectory = join(process.cwd(), "src/packages/trpc/api/modules");
  return readdirSync(modulesDirectory, { withFileTypes: true }).flatMap(
    (directory) => {
      if (!directory.isDirectory()) return [];
      const moduleDirectory = join(modulesDirectory, directory.name);
      return readdirSync(moduleDirectory)
        .filter((fileName) => fileName.endsWith(".router.ts"))
        .map((fileName) => ({
          moduleSpecifier: `@/packages/trpc/api/modules/${directory.name}/${fileName.slice(0, -3)}`,
          fileName,
          source: readFileSync(join(moduleDirectory, fileName), "utf8"),
        }));
    },
  );
}

function createContext(level: UserLevel): Context {
  return {
    db: {} as Context["db"],
    user: { id: "matrix-user", level },
    hasRequest: true,
    header: new Headers(),
    requestId: "req-capability-matrix",
  };
}

describe("capability procedure matrix", () => {
  afterEach(() => configureObservability());

  it("maps all 38 protected procedures onto all 32 defined permissions", () => {
    expect(capabilityProcedureMatrix).toHaveLength(38);
    expect(new Set(capabilityProcedureMatrix.map(([path]) => path)).size).toBe(
      38,
    );
    expect(
      new Set(capabilityProcedureMatrix.map(([, permission]) => permission)),
    ).toEqual(new Set(ALL_PERMISSIONS));
  });

  it("matches direct capability declarations in every real registered router", () => {
    const appRouterSource = readFileSync(
      join(process.cwd(), "src/packages/trpc/api/appRouter.ts"),
      "utf8",
    );
    const expected = capabilityProcedureMatrix.map(
      ([path, permission]) => [path, permission] as const,
    );

    expect(
      extractCapabilityProcedureMatrix(loadRouterSources(), appRouterSource),
    ).toEqual(normalizeDeclarationMatrix(expected));
  });

  it.each(capabilityProcedureMatrix)(
    "%s preserves allowed roles and short-circuits denied handlers, DB, and services",
    async (path, permission, allowedRoles) => {
      configureObservability(createMemoryObservability());
      const executions = { handler: 0, database: 0, service: 0 };
      const databaseOperation = () => {
        executions.database += 1;
      };
      const serviceOperation = () => {
        executions.service += 1;
        databaseOperation();
      };
      const router = createTRPCRouter({
        [path]: permissionProcedure(permission).query(() => {
          executions.handler += 1;
          serviceOperation();
          return "handled";
        }),
      });

      for (const level of ALL_ROLES) {
        const before = { ...executions };
        const caller = router.createCaller(createContext(level)) as Record<
          string,
          () => Promise<string>
        >;
        const call = caller[path]();
        if (allowedRoles.includes(level)) {
          await expect(call).resolves.toBe("handled");
        } else {
          await expect(call).rejects.toMatchObject({ code: "FORBIDDEN" });
          expect(executions).toEqual(before);
        }
      }

      expect(executions).toEqual({
        handler: allowedRoles.length,
        database: allowedRoles.length,
        service: allowedRoles.length,
      });
    },
  );

  it.each([
    [
      "alias",
      `const reader = permissionProcedure(Permission.postReadAll);
       export const sampleRouter = createTRPCRouter({ read: reader.query(() => null) });`,
    ],
    [
      "wrapper",
      `const reader = () => permissionProcedure(Permission.postReadAll);
       export const sampleRouter = createTRPCRouter({ read: reader().query(() => null) });`,
    ],
  ])(
    "fails closed for an unconsumed permissionProcedure %s",
    (_case, source) => {
      expect(() =>
        extractCapabilityProcedureMatrix(
          [{ ...sampleRouterSource, source }],
          sampleAppRouterSource,
        ),
      ).toThrow(/unconsumed permissionProcedure/i);
    },
  );

  it("exposes a router registration rename to the baseline comparison", () => {
    const renamedMatrix = extractCapabilityProcedureMatrix(
      [sampleRouterSource],
      sampleAppRouterSource.replace(
        "sample: sampleRouter",
        "renamed: sampleRouter",
      ),
    );

    expect(renamedMatrix).toEqual([["renamed.read", Permission.postReadAll]]);
  });
});

describe("capability authorization static gate", () => {
  it("contains no legacy procedure or business UserLevel authorization", () => {
    const productionSources = [
      ...loadRouterSources(),
      {
        fileName: "core.ts",
        source: readFileSync(
          join(process.cwd(), "src/packages/trpc/api/core.ts"),
          "utf8",
        ),
      },
    ];

    for (const { fileName, source } of productionSources) {
      expect(() => assertNoLegacyAuthorization(fileName, source)).not.toThrow();
    }
  });

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
  ])("fails closed if code restores %s authorization", (_case, source) => {
    expect(() => assertNoLegacyAuthorization("fixture.ts", source)).toThrow(
      /authorization|authorizes/i,
    );
  });
});
