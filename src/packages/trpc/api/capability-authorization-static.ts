import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";

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

export function assertNoLegacyAuthorization(fileName: string, source: string): void {
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


export function loadProductionSources(): Array<{ fileName: string; source: string }> {
  const sourceRoot = join(process.cwd(), "src");
  const visitDirectory = (directoryPath: string): string[] =>
    readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) return visitDirectory(entryPath);
      if (!entry.name.match(/\.(?:ts|tsx)$/)) return [];
      if (entry.name.match(/\.(?:test|spec)\.(?:ts|tsx)$/)) return [];
      if (entry.name === "capability-authorization-static.ts") return [];
      return [entryPath];
    });

  return visitDirectory(sourceRoot).map((filePath) => ({
    fileName: filePath.slice(process.cwd().length + 1),
    source: readFileSync(filePath, "utf8"),
  }));
}
