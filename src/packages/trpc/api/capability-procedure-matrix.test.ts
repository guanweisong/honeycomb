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
import type { Context } from "./context";

const externalBoundaries = vi.hoisted(() => ({ hash: 0, storage: 0 }));

vi.mock("bcryptjs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("bcryptjs")>()),
  hash: async () => {
    externalBoundaries.hash += 1;
    throw new Error("hash boundary reached");
  },
}));

vi.mock("@/packages/trpc/api/utils/s3", () => ({
  default: {
    getPresignedUrl: async () => {
      externalBoundaries.storage += 1;
      throw new Error("storage boundary reached");
    },
  },
}));

const ALL_ROLES = [UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST] as const;
const ADMIN_EDITOR = [UserLevel.ADMIN, UserLevel.EDITOR] as const;
const ADMIN_ONLY = [UserLevel.ADMIN] as const;

type CapabilityMatrixEntry = readonly [
  path: string,
  permission: PermissionValue,
  allowedRoles: readonly UserLevel[],
  input: unknown,
  firstBoundary: "database" | "hash" | "storage",
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

function bindingIdentifiers(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : bindingIdentifiers(element.name),
  );
}

function isCoreModuleSpecifier(specifier: string): boolean {
  return specifier === "./core" || specifier.endsWith("/core");
}

function assertNoLegacyProcedureAuthorization(
  fileName: string,
  sourceFile: ts.SourceFile,
): void {
  const legacyBindings = new Set<string>();
  const coreNamespaces = new Set<string>();
  const violations = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      isCoreModuleSpecifier(statement.moduleSpecifier.text)
    ) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const importedName = element.propertyName?.text ?? element.name.text;
          if (importedName === "protectedProcedure") {
            legacyBindings.add(element.name.text);
            violations.add("imports the legacy protectedProcedure symbol");
          }
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        coreNamespaces.add(bindings.name.text);
      }
    }

    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === "protectedProcedure"
    ) {
      legacyBindings.add(statement.name.text);
      violations.add("defines protectedProcedure");
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === "protectedProcedure"
        ) {
          legacyBindings.add(declaration.name.text);
          violations.add("defines protectedProcedure");
        }
      }
    }
  }

  const isLegacyReference = (node: ts.Node): boolean => {
    let found = false;
    const visit = (child: ts.Node): void => {
      if (
        ts.isIdentifier(child) &&
        (child.text === "protectedProcedure" || legacyBindings.has(child.text))
      ) {
        found = true;
        return;
      }
      if (
        ts.isPropertyAccessExpression(child) &&
        ts.isIdentifier(child.expression) &&
        coreNamespaces.has(child.expression.text) &&
        child.name.text === "protectedProcedure"
      ) {
        found = true;
        return;
      }
      ts.forEachChild(child, visit);
    };
    visit(node);
    return found;
  };

  let changed = true;
  while (changed) {
    changed = false;
    const visitAliases = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        isLegacyReference(node.initializer)
      ) {
        for (const identifier of bindingIdentifiers(node.name)) {
          if (!legacyBindings.has(identifier)) {
            legacyBindings.add(identifier);
            changed = true;
          }
        }
      }
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.body &&
        isLegacyReference(node.body) &&
        !legacyBindings.has(node.name.text)
      ) {
        legacyBindings.add(node.name.text);
        changed = true;
      }
      ts.forEachChild(node, visitAliases);
    };
    visitAliases(sourceFile);
  }

  const visitUsage = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isLegacyReference(node.expression)) {
      violations.add(
        "calls protectedProcedure through a direct, aliased, or wrapper binding",
      );
    }

    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          const localName = element.propertyName?.text ?? element.name.text;
          if (
            element.name.text === "protectedProcedure" ||
            localName === "protectedProcedure" ||
            legacyBindings.has(localName)
          ) {
            violations.add("exports the legacy protectedProcedure symbol");
          }
        }
      }
    }

    if (
      (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) &&
      node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    ) {
      const names = ts.isFunctionDeclaration(node)
        ? node.name
          ? [node.name.text]
          : []
        : node.declarationList.declarations.flatMap((declaration) =>
            bindingIdentifiers(declaration.name),
          );
      if (names.some((name) => legacyBindings.has(name))) {
        violations.add(
          "exports the legacy protectedProcedure symbol or wrapper",
        );
      }
    }

    ts.forEachChild(node, visitUsage);
  };
  visitUsage(sourceFile);

  if (violations.size > 0) {
    throw new Error(
      `${fileName} restores legacy role authorization: ${[...violations].join("; ")}`,
    );
  }
}

const ROLE_STRING_VALUES = new Set(["ADMIN", "EDITOR", "GUEST"]);
const ROLE_VALUE_NAME = /(?:role|level)/i;
const AUTHORIZATION_HELPER_NAME =
  /(?:authori[sz]|auth|access|allow|permission|privilege|role|level)/i;
const ROLE_POLICY_ALLOWLIST = new Set([
  "src/packages/identity/auth/permissions.ts",
  "src/packages/infrastructure/db/schema.ts",
  "src/packages/domain/identity/user.ts",
]);

function assertNoRoleBasedAuthorization(
  fileName: string,
  sourceFile: ts.SourceFile,
): void {
  if (ROLE_POLICY_ALLOWLIST.has(fileName)) return;

  const roleEnumBindings = new Set(["UserLevel"]);
  const roleValueBindings = new Set<string>();
  const violations = new Set<string>();

  const isComputedRoleAccess = (node: ts.Node): boolean =>
    ts.isElementAccessExpression(node) &&
    ((ts.isIdentifier(node.expression) &&
      roleEnumBindings.has(node.expression.text) &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      ROLE_STRING_VALUES.has(node.argumentExpression.text)) ||
      (node.argumentExpression !== undefined &&
        ts.isStringLiteralLike(node.argumentExpression) &&
        node.argumentExpression.text === "level"));

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.endsWith("user.level")
    ) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const importedName = element.propertyName?.text ?? element.name.text;
          if (importedName === "UserLevel") {
            roleEnumBindings.add(element.name.text);
          }
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        roleEnumBindings.add(bindings.name.text);
      }
    }
  }

  const isRoleExpression = (node: ts.Node): boolean => {
    let found = false;
    const visit = (child: ts.Node): void => {
      if (
        (ts.isStringLiteralLike(child) && ROLE_STRING_VALUES.has(child.text)) ||
        (ts.isIdentifier(child) &&
          (roleValueBindings.has(child.text) ||
            ROLE_VALUE_NAME.test(child.text))) ||
        (ts.isPropertyAccessExpression(child) &&
          (child.name.text === "level" ||
            (ts.isIdentifier(child.expression) &&
              roleEnumBindings.has(child.expression.text)))) ||
        isComputedRoleAccess(child)
      ) {
        found = true;
        return;
      }
      ts.forEachChild(child, visit);
    };
    visit(node);
    return found;
  };

  const isDirectRoleValue = (node: ts.Expression): boolean => {
    if (ts.isParenthesizedExpression(node)) {
      return isDirectRoleValue(node.expression);
    }
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      return isDirectRoleValue(node.expression);
    }
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.some(
        (element) => ts.isExpression(element) && isDirectRoleValue(element),
      );
    }
    return (
      (ts.isStringLiteralLike(node) && ROLE_STRING_VALUES.has(node.text)) ||
      (ts.isIdentifier(node) &&
        (roleValueBindings.has(node.text) ||
          ROLE_VALUE_NAME.test(node.text))) ||
      (ts.isPropertyAccessExpression(node) &&
        (node.name.text === "level" ||
          (ts.isIdentifier(node.expression) &&
            roleEnumBindings.has(node.expression.text)))) ||
      isComputedRoleAccess(node)
    );
  };

  let changed = true;
  while (changed) {
    changed = false;
    const collectAliases = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        isDirectRoleValue(node.initializer) &&
        !roleValueBindings.has(node.name.text)
      ) {
        roleValueBindings.add(node.name.text);
        changed = true;
      }

      ts.forEachChild(node, collectAliases);
    };
    collectAliases(sourceFile);
  }

  const visitAuthorization = (node: ts.Node): void => {
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.SyntaxKind.LessThanToken,
        ts.SyntaxKind.LessThanEqualsToken,
        ts.SyntaxKind.GreaterThanToken,
        ts.SyntaxKind.GreaterThanEqualsToken,
      ].includes(node.operatorToken.kind) &&
      (isRoleExpression(node.left) || isRoleExpression(node.right))
    ) {
      violations.add("compares a UserLevel or role value");
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ["includes", "has"].includes(node.expression.name.text) &&
      (isRoleExpression(node.expression.expression) ||
        node.arguments.some(isRoleExpression))
    ) {
      violations.add("authorizes through UserLevel role membership");
    }

    if (
      ts.isSwitchStatement(node) &&
      (isRoleExpression(node.expression) ||
        node.caseBlock.clauses.some(
          (clause) =>
            ts.isCaseClause(clause) && isRoleExpression(clause.expression),
        ))
    ) {
      violations.add("switches on a UserLevel or role value");
    }

    if (ts.isCallExpression(node)) {
      const helperName = ts.isIdentifier(node.expression)
        ? node.expression.text
        : ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : "";
      if (
        helperName !== "can" &&
        AUTHORIZATION_HELPER_NAME.test(helperName) &&
        node.arguments.some(isRoleExpression)
      ) {
        violations.add("calls a role-based authorization helper");
      }
    }

    ts.forEachChild(node, visitAuthorization);
  };
  visitAuthorization(sourceFile);

  if (violations.size > 0) {
    throw new Error(
      `${fileName} restores role-based authorization: ${[...violations].join("; ")}`,
    );
  }
}

function assertNoLegacyAuthorization(fileName: string, source: string): void {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  assertNoLegacyProcedureAuthorization(fileName, sourceFile);
  assertNoRoleBasedAuthorization(fileName, sourceFile);
}

const TEST_ID = "0123456789abcdef01234567";
const LIST_INPUT = {};
const DELETE_INPUT = { ids: [TEST_ID] };
const I18N_INPUT = { en: "Test", zh: "测试" };

const capabilityProcedureMatrix: readonly CapabilityMatrixEntry[] = [
  [
    "accountSecurity.loginHistory",
    Permission.userReadSelf,
    ALL_ROLES,
    undefined,
    "database",
  ],
  [
    "category.adminIndex",
    Permission.categoryReadAll,
    ALL_ROLES,
    LIST_INPUT,
    "database",
  ],
  [
    "category.create",
    Permission.categoryCreate,
    ADMIN_EDITOR,
    {
      title: I18N_INPUT,
      description: I18N_INPUT,
      path: "/test",
      status: "ENABLE",
    },
    "database",
  ],
  [
    "category.destroy",
    Permission.categoryDelete,
    ADMIN_EDITOR,
    DELETE_INPUT,
    "database",
  ],
  [
    "category.update",
    Permission.categoryUpdate,
    ADMIN_EDITOR,
    { id: TEST_ID },
    "database",
  ],
  [
    "comment.index",
    Permission.commentReadAll,
    ALL_ROLES,
    LIST_INPUT,
    "database",
  ],
  [
    "comment.update",
    Permission.commentModerate,
    ADMIN_ONLY,
    { id: TEST_ID },
    "database",
  ],
  [
    "comment.destroy",
    Permission.commentModerate,
    ADMIN_ONLY,
    DELETE_INPUT,
    "database",
  ],
  [
    "link.adminIndex",
    Permission.linkReadAll,
    ALL_ROLES,
    LIST_INPUT,
    "database",
  ],
  [
    "link.create",
    Permission.linkCreate,
    ADMIN_ONLY,
    {
      name: "Test",
      url: "https://example.test",
      logo: "https://example.test/logo.png",
      status: "ENABLE",
    },
    "database",
  ],
  ["link.destroy", Permission.linkDelete, ADMIN_ONLY, DELETE_INPUT, "database"],
  [
    "link.update",
    Permission.linkUpdate,
    ADMIN_ONLY,
    { id: TEST_ID },
    "database",
  ],
  ["media.index", Permission.mediaReadAll, ALL_ROLES, LIST_INPUT, "database"],
  [
    "media.getPresignedUrl",
    Permission.mediaUpload,
    ADMIN_EDITOR,
    { name: "test.jpg", type: "image/jpeg" },
    "storage",
  ],
  [
    "media.upload",
    Permission.mediaUpload,
    ADMIN_EDITOR,
    { name: "test.jpg", size: 1, type: "image/jpeg", key: "test.jpg" },
    "database",
  ],
  [
    "media.destroy",
    Permission.mediaDelete,
    ADMIN_EDITOR,
    DELETE_INPUT,
    "database",
  ],
  ["menu.adminIndex", Permission.menuReadAll, ALL_ROLES, undefined, "database"],
  ["menu.saveAll", Permission.menuUpdate, ADMIN_EDITOR, [], "database"],
  [
    "page.adminIndex",
    Permission.pageReadAll,
    ALL_ROLES,
    LIST_INPUT,
    "database",
  ],
  [
    "page.adminDetail",
    Permission.pageReadAll,
    ALL_ROLES,
    { id: TEST_ID },
    "database",
  ],
  [
    "page.create",
    Permission.pageCreate,
    ADMIN_EDITOR,
    {
      title: I18N_INPUT,
      content: I18N_INPUT,
      status: "PUBLISH",
      template: "default",
    },
    "database",
  ],
  [
    "page.destroy",
    Permission.pageDelete,
    ADMIN_EDITOR,
    DELETE_INPUT,
    "database",
  ],
  [
    "page.update",
    Permission.pageUpdate,
    ADMIN_EDITOR,
    { id: TEST_ID },
    "database",
  ],
  [
    "post.adminIndex",
    Permission.postReadAll,
    ALL_ROLES,
    LIST_INPUT,
    "database",
  ],
  [
    "post.adminDetail",
    Permission.postReadAll,
    ALL_ROLES,
    { id: TEST_ID },
    "database",
  ],
  [
    "post.create",
    Permission.postCreate,
    ADMIN_EDITOR,
    {
      title: I18N_INPUT,
      content: I18N_INPUT,
      status: "PUBLISH",
      type: "ARTICLE",
      categoryId: TEST_ID,
    },
    "database",
  ],
  [
    "post.destroy",
    Permission.postDelete,
    ADMIN_EDITOR,
    DELETE_INPUT,
    "database",
  ],
  [
    "post.update",
    Permission.postUpdate,
    ADMIN_EDITOR,
    { id: TEST_ID },
    "database",
  ],
  [
    "post.updateTags",
    Permission.postManageTags,
    ADMIN_EDITOR,
    { postId: TEST_ID, tagIds: [TEST_ID], type: "ACTOR" },
    "database",
  ],
  [
    "setting.update",
    Permission.settingUpdate,
    ADMIN_ONLY,
    {
      id: TEST_ID,
      siteName: I18N_INPUT,
      siteSubName: I18N_INPUT,
      siteSignature: I18N_INPUT,
      siteCopyright: I18N_INPUT,
    },
    "database",
  ],
  [
    "statistic.index",
    Permission.statisticsRead,
    ALL_ROLES,
    undefined,
    "database",
  ],
  [
    "tag.create",
    Permission.tagCreate,
    ADMIN_EDITOR,
    { name: I18N_INPUT },
    "database",
  ],
  ["tag.destroy", Permission.tagDelete, ADMIN_ONLY, DELETE_INPUT, "database"],
  [
    "tag.update",
    Permission.tagUpdate,
    ADMIN_EDITOR,
    { id: TEST_ID },
    "database",
  ],
  ["user.current", Permission.userReadSelf, ALL_ROLES, undefined, "database"],
  ["user.index", Permission.userReadAll, ADMIN_EDITOR, LIST_INPUT, "database"],
  [
    "user.create",
    Permission.userManage,
    ADMIN_ONLY,
    {
      name: "Test",
      email: "test@example.test",
      password: "password123",
      level: UserLevel.EDITOR,
      status: "ENABLE",
    },
    "database",
  ],
  ["user.destroy", Permission.userManage, ADMIN_ONLY, DELETE_INPUT, "database"],
  [
    "user.update",
    Permission.userManage,
    ADMIN_ONLY,
    { id: TEST_ID },
    "database",
  ],
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

function loadProductionSources(): Array<{ fileName: string; source: string }> {
  const sourceRoot = join(process.cwd(), "src");
  const visitDirectory = (directoryPath: string): string[] =>
    readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) return visitDirectory(entryPath);
      if (!entry.name.match(/\.(?:ts|tsx)$/)) return [];
      if (entry.name.match(/\.(?:test|spec)\.(?:ts|tsx)$/)) return [];
      return [entryPath];
    });

  return visitDirectory(sourceRoot).map((filePath) => ({
    fileName: filePath.slice(process.cwd().length + 1),
    source: readFileSync(filePath, "utf8"),
  }));
}

interface BoundaryCounts {
  database: number;
  hash: number;
  storage: number;
}

function createDatabaseBoundary(counts: BoundaryCounts): Context["db"] {
  return new Proxy({} as Context["db"], {
    get: (_target, property) => {
      counts.database += 1;
      throw new Error(`database boundary reached: ${String(property)}`);
    },
  });
}

function createContext(level: UserLevel, db: Context["db"]): Context {
  return {
    db,
    user: { id: "matrix-user", level },
    hasRequest: true,
    header: new Headers(),
    requestId: "req-capability-matrix",
  };
}

function deniedRoleFor(allowedRoles: readonly UserLevel[]): UserLevel {
  if (!allowedRoles.includes(UserLevel.EDITOR)) return UserLevel.EDITOR;
  if (!allowedRoles.includes(UserLevel.GUEST)) return UserLevel.GUEST;
  return "UNKNOWN_AUTHENTICATED_ROLE" as UserLevel;
}

function boundaryCounts(database = 0): BoundaryCounts {
  return {
    database,
    hash: externalBoundaries.hash,
    storage: externalBoundaries.storage,
  };
}

function callActualProcedure(
  path: string,
  context: Context,
  input: unknown,
): Promise<unknown> {
  const [routerName, procedureName] = path.split(".");
  const caller = appRouter.createCaller(context) as unknown as Record<
    string,
    Record<string, (input?: unknown) => Promise<unknown>>
  >;
  const procedure = caller[routerName]?.[procedureName];
  if (!procedure) throw new Error(`Unknown appRouter procedure: ${path}`);
  return input === undefined ? procedure() : procedure(input);
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
      const counts = boundaryCounts();
      const db = createDatabaseBoundary(counts);

      await expect(
        callActualProcedure(
          path,
          createContext(deniedRoleFor(allowedRoles), db),
          input,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      expect(boundaryCounts(counts.database)).toEqual({
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
      const counts = boundaryCounts();
      const db = createDatabaseBoundary(counts);

      await callActualProcedure(
        path,
        createContext(UserLevel.ADMIN, db),
        input,
      ).catch(() => undefined);

      expect(boundaryCounts(counts.database)[firstBoundary]).toBeGreaterThan(0);
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
    const productionSources = loadProductionSources();
    expect(productionSources.length).toBeGreaterThan(100);

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
