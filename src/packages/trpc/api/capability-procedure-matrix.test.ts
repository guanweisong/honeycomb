import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import * as ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ALL_PERMISSIONS,
  Permission,
  type Permission as PermissionValue,
} from "@/packages/identity/auth/permissions";
import { createMemoryObservability } from "@/packages/infrastructure/observability/adapters/memory";
import { configureObservability } from "@/packages/infrastructure/observability/server/registry";
import { UserLevel } from "@/packages/domain/identity/user";

import { appRouter } from "./app-router";
import { capabilityProcedureMatrix } from "./capability-procedure-matrix-data";
import {
  boundaryCounts,
  callActualProcedure,
  createContext,
  createDatabaseBoundary,
  deniedRoleFor,
} from "./capability-procedure-matrix-test-helpers";

const externalBoundaries = vi.hoisted(() => ({ hash: 0, storage: 0 }));

vi.mock("bcryptjs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("bcryptjs")>()),
  hash: async () => {
    externalBoundaries.hash += 1;
    throw new Error("hash boundary reached");
  },
}));

vi.mock("@/packages/infrastructure/storage/S3", () => ({
  default: {
    getPresignedUrl: async () => {
      externalBoundaries.storage += 1;
      throw new Error("storage boundary reached");
    },
  },
}));

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
    "app-router.ts",
    appRouterSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const routerImports = readRouterImports(appSourceFile);
  const appDeclaration = findRouterDeclaration(appSourceFile, "app-router.ts");
  const registrations = readRouterRegistrations(
    appDeclaration.routerObject,
    "app-router.ts",
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
  const packageRouters = readdirSync(modulesDirectory, { withFileTypes: true }).flatMap(
    (directory) => {
      if (!directory.isDirectory()) return [];
      const moduleDirectory = join(modulesDirectory, directory.name);
      return readdirSync(moduleDirectory)
        .filter((fileName) => fileName.endsWith(".router.ts"))
        .map((fileName) => {
          return {
            moduleSpecifier: `@/packages/trpc/api/modules/${directory.name}/${fileName.slice(0, -3)}`,
            fileName,
            source: readFileSync(join(moduleDirectory, fileName), "utf8"),
          };
        });
    },
  );

  const featureRouterEntries = [
    ["comment", "comment"],
    ["post", "post"],
    ["media", "media"],
    ["link", "link"],
    ["menu", "menu"],
    ["page", "page"],
    ["setting", "setting"],
    ["setting", "statistic"],
    ["tag", "tag"],
    ["user", "user"],
    ["user", "account-security"],
    ["category", "category"],
  ] as const;
  const flattenedFeatures = new Set([
    "category",
    "link",
    "media",
    "menu",
    "page",
    "setting",
    "tag",
    "comment",
    "post",
    "user",
  ]);
  const featureRouters = featureRouterEntries.map(([feature, router]) => {
    const directory = flattenedFeatures.has(feature) ? "" : "transport/";
    return {
    moduleSpecifier: `@/features/${feature}/${directory}${router}.router`,
    fileName: `${router}.router.ts`,
    source: readFileSync(
      join(process.cwd(), "src/features", feature, directory, `${router}.router.ts`),
      "utf8",
    ),
    };
  });

  return [...packageRouters, ...featureRouters];
}

describe("capability procedure matrix", () => {
  beforeEach(() => {
    externalBoundaries.hash = 0;
    externalBoundaries.storage = 0;
  });
  afterEach(() => configureObservability());

  it("maps all 39 protected procedures onto all 32 defined permissions", () => {
    expect(capabilityProcedureMatrix).toHaveLength(39);
    expect(new Set(capabilityProcedureMatrix.map(([path]) => path)).size).toBe(
      39,
    );
    expect(
      new Set(capabilityProcedureMatrix.map(([, permission]) => permission)),
    ).toEqual(new Set(ALL_PERMISSIONS));
  });

  it("matches direct capability declarations in every real registered router", () => {
    const appRouterSource = readFileSync(
      join(process.cwd(), "src/packages/trpc/api/app-router.ts"),
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
    "%s rejects a real caller before its handler reaches any boundary",
    async (path, _permission, allowedRoles, input) => {
      configureObservability(createMemoryObservability());
      const counts = boundaryCounts(externalBoundaries);
      const db = createDatabaseBoundary(counts);

      await expect(
        callActualProcedure(
          appRouter,
          path,
          createContext(deniedRoleFor(allowedRoles), db),
          input,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      expect(boundaryCounts(externalBoundaries, counts.database)).toEqual({
        database: 0,
        hash: 0,
        storage: 0,
      });
    },
  );

  it.each(capabilityProcedureMatrix)(
    "%s reaches its real first boundary when authorization is allowed",
    async (path, _permission, _allowedRoles, input, firstBoundary) => {
      configureObservability(createMemoryObservability());
      const counts = boundaryCounts(externalBoundaries);
      const db = createDatabaseBoundary(counts);

      await callActualProcedure(
        appRouter,
        path,
        createContext(UserLevel.ADMIN, db),
        input,
      ).catch(() => undefined);

      expect(
        boundaryCounts(externalBoundaries, counts.database)[firstBoundary],
      ).toBeGreaterThan(0);
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
