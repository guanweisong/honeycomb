import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { builtinModules } from "node:module";
import ts from "typescript";

export interface ModuleDependency {
  specifier: string;
  typeOnly: boolean;
}

// Bound worker-local retention during watch runs and fixture-heavy suites. Cache
// only derived metadata, never mutable TypeScript ASTs or filesystem snapshots.
const dependencyCache = new Map<
  string,
  { source: string; dependencies: ModuleDependency[] }
>();
const maxCachedSources = 1024;

/** Include re-exports, dynamic imports and require, not only static imports. */
export function moduleDependencies(
  source: string,
  path = "module.ts",
): ModuleDependency[] {
  const cached = dependencyCache.get(path);
  if (cached?.source === source)
    return cached.dependencies.map((dependency) => ({ ...dependency }));

  const result: ModuleDependency[] = [];
  const file = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  function visit(node: ts.Node) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      result.push({
        specifier: node.moduleSpecifier.text,
        typeOnly: Boolean(
          clause?.isTypeOnly ||
          (!clause?.name &&
            bindings &&
            ts.isNamedImports(bindings) &&
            bindings.elements.length > 0 &&
            bindings.elements.every((element) => element.isTypeOnly)),
        ),
      });
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      result.push({
        specifier: node.moduleSpecifier.text,
        typeOnly:
          node.isTypeOnly ||
          Boolean(
            node.exportClause &&
            ts.isNamedExports(node.exportClause) &&
            node.exportClause.elements.length > 0 &&
            node.exportClause.elements.every((element) => element.isTypeOnly),
          ),
      });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      result.push({
        specifier: node.moduleReference.expression.text,
        typeOnly: node.isTypeOnly,
      });
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      result.push({ specifier: node.argument.literal.text, typeOnly: true });
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument))
        result.push({ specifier: argument.text, typeOnly: false });
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  dependencyCache.delete(path);
  dependencyCache.set(path, { source, dependencies: result });
  if (dependencyCache.size > maxCachedSources) {
    const oldest = dependencyCache.keys().next().value;
    if (oldest !== undefined) dependencyCache.delete(oldest);
  }
  // Every caller owns its result, including the first caller on a cache miss.
  return result.map((dependency) => ({ ...dependency }));
}

export function localModulePath(
  importer: string,
  specifier: string,
): string | undefined {
  const path = specifier.startsWith("@/")
    ? join("src", specifier.slice(2))
    : specifier.startsWith(".")
      ? relative(process.cwd(), resolve(dirname(importer), specifier))
      : undefined;
  return path?.replaceAll("\\", "/");
}

export function resolveSourceModule(
  importer: string,
  specifier: string,
): string | undefined {
  const base = localModulePath(importer, specifier);
  if (!base) return undefined;
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

/** Follow runtime edges only: type imports must not contaminate browser bundles. */
export function runtimeDependencyViolations(
  entry: string,
  forbidden: (path: string, source: string) => boolean,
): string[] {
  const visited = new Set<string>();
  const violations = new Set<string>();
  function visit(path: string) {
    if (visited.has(path)) return;
    visited.add(path);
    const source = readFileSync(path, "utf8");
    if (path !== entry && forbidden(path, source)) {
      violations.add(`${entry} -> ${path}`);
      return;
    }
    for (const dependency of moduleDependencies(source, path)) {
      if (dependency.typeOnly) continue;
      const target = resolveSourceModule(path, dependency.specifier);
      if (target) visit(target);
    }
  }
  visit(entry);
  return [...violations].sort();
}

/** Exact reviewed type edge, shared by both persistence-boundary checks. */
export function isReviewedLinkTableTypeDependency(
  path: string,
  dependency: ModuleDependency,
  source: string,
): boolean {
  const target = "src/lib/db/schema/link";
  if (
    path !== "src/features/link/types/link.record.ts" ||
    !dependency.typeOnly ||
    localModulePath(path, dependency.specifier) !== target
  )
    return false;
  // A matching import cannot hide a second export/import-type edge to the table.
  if (
    moduleDependencies(source, path).filter(
      (edge) => localModulePath(path, edge.specifier) === target,
    ).length !== 1
  )
    return false;
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  // Only the LinkRecord declaration is public; exporting its imported table is not.
  if (file.statements.some(ts.isExportDeclaration)) return false;
  return file.statements.some((node) => {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      localModulePath(path, node.moduleSpecifier.text) !== target
    )
      return false;
    const clause = node.importClause;
    const bindings = clause?.namedBindings;
    if (
      !clause?.isTypeOnly ||
      clause.name ||
      !bindings ||
      !ts.isNamedImports(bindings) ||
      bindings.elements.length !== 1
    )
      return false;
    const binding = bindings.elements[0];
    return !!binding && (binding.propertyName ?? binding.name).text === "link";
  });
}

export function isContractForbidden(
  path: string,
  source: string,
  includeTypeOnly = false,
) {
  return (
    /\/(?:server|admin|public|components|notifications|presentation)(?:\/|\.tsx?$)/.test(
      path,
    ) ||
    /^src\/lib\/(?:db|trpc)\//.test(path) ||
    moduleDependencies(source, path).some(({ specifier, typeOnly }) => {
      // Reviewed fixed-field projection only; not a types/ or DB allowance.
      if (
        isReviewedLinkTableTypeDependency(path, { specifier, typeOnly }, source)
      )
        return false;
      return (
        (includeTypeOnly || !typeOnly) &&
        (/^(?:react|next(?:\/|$)|@trpc\/|drizzle-orm|drizzle-zod|node:|bun:|@libsql\/|@aws-sdk\/|@sentry\/node|resend$|better-auth$|server-only$)/.test(
          specifier,
        ) ||
          builtinModules.includes(specifier) ||
          /^(?:src\/(?:app|components)\/|src\/lib\/(?:db|trpc)\/)|\/(?:server|admin|public|notifications)(?:\/|$)|(?:\/|\.)router$/.test(
            localModulePath(path, specifier) ?? "",
          ) ||
          /(?:\/server(?:\/|$)|\/router$|^@\/lib\/(?:db|trpc)\/|^@\/components\/|\/admin\/|\/public\/)/.test(
            specifier,
          ))
      );
    })
  );
}
