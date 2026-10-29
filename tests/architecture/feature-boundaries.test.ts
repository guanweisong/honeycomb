// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";
import { sourceFiles } from "@tests/helpers/source-files";
import {
  isContractForbidden,
  isReviewedLinkTableTypeDependency,
  localModulePath,
  moduleDependencies,
  runtimeDependencyViolations,
  resolveSourceModule,
} from "@tests/helpers/architecture-imports";

import {
  featureInventory,
  isAuthoritativeContract,
  isFeatureRouter,
} from "@tests/helpers/feature-inventory";

const featuresRoot = "src/features";
const features = featureInventory(featuresRoot);
const featureFiles = features.flatMap(({ files }) => files);
const routers = featureFiles.filter(isFeatureRouter);

function featureUiDependencyViolations(path: string, source: string) {
  if (!/\/(?:admin|public|shared|components|presentation)\//.test(path))
    return [];
  return moduleDependencies(source, path)
    .filter(
      ({ specifier }) =>
        /^drizzle-/.test(specifier) ||
        /^src\/lib\/db(?:\/|$)/.test(localModulePath(path, specifier) ?? "") ||
        (/^src\/features\/media\/admin\//.test(path) &&
          specifier.includes("lib/trpc/outputs")),
    )
    .map(({ specifier }) => `${path} -> ${specifier}`);
}

/** Inspect values actually mounted in appRouter, not merely imported routers. */
function composedRouters(source: string, path = "src/app/trpc/router.ts") {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const imports = new Map<string, { specifier: string; imported: string }>();
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    if (clause?.isTypeOnly || !bindings || !ts.isNamedImports(bindings))
      continue;
    for (const binding of bindings.elements) {
      if (!binding.isTypeOnly)
        imports.set(binding.name.text, {
          specifier: statement.moduleSpecifier.text,
          imported: (binding.propertyName ?? binding.name).text,
        });
    }
  }
  const mounted: string[] = [];
  let found = false;
  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "appRouter"
    ) {
      found = true;
      const call = node.initializer;
      const factory =
        call && ts.isCallExpression(call) && ts.isIdentifier(call.expression)
          ? imports.get(call.expression.text)
          : undefined;
      if (
        !call ||
        !ts.isCallExpression(call) ||
        !ts.isIdentifier(call.expression) ||
        !factory ||
        factory.imported !== "createTRPCRouter" ||
        localModulePath(path, factory.specifier) !== "src/lib/trpc/core"
      )
        throw new Error(
          "appRouter must use the imported tRPC composition function",
        );
      const object = call.arguments[0];
      if (!object || !ts.isObjectLiteralExpression(object))
        throw new Error("appRouter composition must be inspectable");
      for (const property of object.properties) {
        const value = ts.isPropertyAssignment(property)
          ? property.initializer
          : ts.isShorthandPropertyAssignment(property)
            ? property.name
            : undefined;
        if (!value || !ts.isIdentifier(value))
          throw new Error("Uninspectable appRouter member");
        const specifier = imports.get(value.text)?.specifier;
        const target = specifier && resolveSourceModule(path, specifier);
        if (!target || !isFeatureRouter(target))
          throw new Error(`Unresolved feature router: ${value.text}`);
        mounted.push(target);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (!found || mounted.length === 0)
    throw new Error("No feature routers mounted in appRouter");
  return mounted.sort();
}

function mutationBoundaryViolations(path: string, source: string) {
  const feature = path.match(/^src\/features\/([^/]+)\//)?.[1];
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const operations = new Set<string>();
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.importClause ||
      statement.importClause.isTypeOnly
    )
      continue;
    const target = localModulePath(path, statement.moduleSpecifier.text);
    if (
      !(
        target === `src/features/${feature}/server` ||
        target?.startsWith(`src/features/${feature}/server/`)
      ) &&
      !target?.startsWith(`src/features/${feature}/account-security/server/`)
    )
      continue;
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements)
        if (!binding.isTypeOnly) operations.add(binding.name.text);
    }
  }
  const violations: string[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "mutation"
    ) {
      const handler = node.arguments[0];
      let callsOperation = false;
      function inspect(child: ts.Node) {
        if (
          ts.isCallExpression(child) &&
          ts.isIdentifier(child.expression) &&
          operations.has(child.expression.text)
        )
          callsOperation = true;
        ts.forEachChild(child, inspect);
      }
      if (handler) inspect(handler);
      if (!callsOperation)
        violations.push(
          `${path}:${file.getLineAndCharacterOfPosition(node.getStart()).line + 1}`,
        );
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return violations;
}

function isPureContract(path: string) {
  return (
    isAuthoritativeContract(path) ||
    /\/rules\/[^/]+\.ts$/.test(path) ||
    /^src\/features\/[^/]+\/(?:types|schema|rules|[^/]+-status|[^/]+-type|[^/]+-types|[^/]+-kind|[^/]+-template|user)\.ts$/.test(
      path,
    )
  );
}

describe("feature-owned business boundaries", () => {
  it("discovers every feature source without requiring unused responsibility files", () => {
    expect(features.length).toBeGreaterThan(0);
    expect(featureFiles.length).toBeGreaterThan(0);
    expect(featureFiles.toSorted()).toEqual(sourceFiles(featuresRoot));
    for (const feature of features)
      expect(feature.files.length, feature.name).toBeGreaterThan(0);
  });

  it("discovers future UI-only and server-read-only features without boilerplate contracts or routers", () => {
    const root = mkdtempSync(join(tmpdir(), "feature-inventory-"));
    try {
      mkdirSync(join(root, "future-banner", "public"), { recursive: true });
      mkdirSync(join(root, "future-report"));
      writeFileSync(
        join(root, "future-banner", "public", "Banner.tsx"),
        "export const Banner = () => null;",
      );
      writeFileSync(
        join(root, "future-report", "server.ts"),
        "export const readReport = () => []; ",
      );
      const discovered = featureInventory(root);
      expect(discovered).toEqual([
        {
          name: "future-banner",
          files: [join(root, "future-banner", "public", "Banner.tsx")],
        },
        {
          name: "future-report",
          files: [join(root, "future-report", "server.ts")],
        },
      ]);
      expect(
        discovered.flatMap(({ files }) => files).filter(isFeatureRouter),
      ).toEqual([]);
      mkdirSync(join(root, "future-report", "nested"));
      writeFileSync(
        join(root, "future-report", "nested", "audit.router.ts"),
        "export const auditRouter = {}; ",
      );
      expect(
        featureInventory(root)
          .flatMap(({ files }) => files)
          .filter(isFeatureRouter),
      ).toEqual([join(root, "future-report", "nested", "audit.router.ts")]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("mounts every discovered feature router in the actual root composition", () => {
    expect(routers.length).toBeGreaterThan(0);
    expect(
      composedRouters(readFileSync("src/app/trpc/router.ts", "utf8")),
    ).toEqual(routers.toSorted());
  });

  it("detects imported but unmounted routers and rejects vacuous or opaque composition", () => {
    const imports = [
      'import { createTRPCRouter } from "../../lib/trpc/core";',
      'import { postRouter as posts } from "@/features/post/router";',
      'import { tagRouter } from "@/features/tag/router";',
    ].join("\n");
    expect(
      composedRouters(
        `${imports} export const appRouter = createTRPCRouter({ posts });`,
      ),
    ).toEqual(["src/features/post/router.ts"]);
    expect(
      composedRouters(
        `${imports} export const appRouter = createTRPCRouter({ posts, tags: tagRouter });`,
      ),
    ).toEqual(["src/features/post/router.ts", "src/features/tag/router.ts"]);
    for (const source of [
      imports,
      `${imports} export const appRouter = createTRPCRouter({});`,
      `${imports} export const appRouter = createTRPCRouter({ ...posts });`,
      `${imports} export const appRouter = createTRPCRouter({ posts: missing });`,
      `${imports} import type { userRouter } from "@/features/user/router"; export const appRouter = createTRPCRouter({ userRouter });`,
    ]) {
      expect(() => composedRouters(source)).toThrow();
    }
  });

  it("does not recreate packages, central contracts or artificial layered directories", () => {
    const retired =
      /\/(?:application|domain|infrastructure|interfaces|contracts)\/|(?:-use-cases|-command-handlers|\/service)\.ts$/;
    expect(featureFiles.filter((path) => retired.test(path))).toEqual([]);
    expect(
      routers.flatMap((path) =>
        moduleDependencies(readFileSync(path, "utf8"), path)
          .filter(({ specifier }) =>
            /^src\/features\/[^/]+\/service$/.test(
              localModulePath(path, specifier) ?? "",
            ),
          )
          .map(({ specifier }) => `${path} -> ${specifier}`),
      ),
    ).toEqual([]);
  });

  it("detects a mutation bypassing its feature server operation", () => {
    expect(
      mutationBoundaryViolations(
        "src/features/post/router.ts",
        [
          'import { createPost } from "./server/post-commands";',
          "router({ save: procedure.mutation(({ ctx }) => ctx.db.insert(ctx.input)) });",
        ].join("\n"),
      ),
    ).toEqual(["src/features/post/router.ts:2"]);
    expect(
      mutationBoundaryViolations(
        "src/features/post/router.ts",
        [
          'import { createPost } from "./server/post-commands";',
          "router({ save: procedure.mutation(({ ctx, input }) => createPost(ctx.db, input)) });",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("keeps all mutations behind feature-owned server operations without prescribing their internal call chain", () => {
    expect(routers.length).toBeGreaterThan(0);
    expect(
      routers.flatMap((path) =>
        mutationBoundaryViolations(path, readFileSync(path, "utf8")),
      ),
    ).toEqual([]);
  });

  it("keeps routers free of direct ORM writes and business side effects", () => {
    const violations = featureFiles.filter(isFeatureRouter).filter((path) => {
      const source = readFileSync(path, "utf8");
      return (
        /\b(?:ctx\.)?db\s*\.\s*(?:insert|update|delete|transaction)\s*\(/.test(
          source,
        ) ||
        /R2Storage\.(?:deleteObjects|getPresignedUrl)|sendCommentEmail\s*\(/.test(
          source,
        )
      );
    });
    expect(violations).toEqual([]);
  });

  it("shares contracts directly without importing another feature's transport or app composition", () => {
    const violations = featureFiles.flatMap((path) =>
      moduleDependencies(readFileSync(path, "utf8"), path).flatMap(
        ({ specifier }) => {
          const target = localModulePath(path, specifier);
          return target &&
            (/^src\/app(?:\/|$)/.test(target) ||
              /^src\/features\/[^/]+\/(?:[^/]+\.)?router$/.test(target))
            ? [`${path} -> ${specifier}`]
            : [];
        },
      ),
    );
    expect(violations).toEqual([]);
  });

  it("keeps business schemas, types, rules and catalogs independent of runtime/UI/persistence modules", () => {
    const contracts = featureFiles.filter(isPureContract);
    expect(contracts.filter(isAuthoritativeContract).length).toBeGreaterThan(0);
    expect(
      contracts.filter((path) => path.includes("/rules/")).length,
    ).toBeGreaterThan(0);
    const violations = contracts.flatMap((path) => {
      return [
        ...(/\/(?:schemas|types|rules)\/[^/]+\.ts$/.test(path) &&
        /\b(?:Headers|Request|Response|FormData|TRPCError)\b/.test(
          readFileSync(path, "utf8"),
        )
          ? [path]
          : []),
        // Public contracts also cannot expose forbidden framework/ORM types.
        ...(isContractForbidden(path, readFileSync(path, "utf8"), true)
          ? [path]
          : []),
        ...runtimeDependencyViolations(path, isContractForbidden),
      ];
    });
    expect(violations).toEqual([]);
  });

  it("detects providers, runtime operations and wildcard business exports hidden in data contracts", () => {
    const source = [
      'export { CurrentUserProvider } from "@/features/user/admin/use-current-user";',
      'export { getCurrentUser } from "./server/user-queries";',
      'export * from "@/features/user/server";',
      'export { MediaRecordSchema } from "@/features/media/schemas/media.record.schema";',
      'export type { CurrentUserRecord } from "./types";',
    ].join("\n");
    expect(
      source
        .split("\n")
        .filter((statement) =>
          isContractForbidden("src/features/user/schema.ts", statement, true),
        ),
    ).toEqual([
      'export { CurrentUserProvider } from "@/features/user/admin/use-current-user";',
      'export { getCurrentUser } from "./server/user-queries";',
      'export * from "@/features/user/server";',
    ]);
  });

  it.each([
    "../../components/View",
    "../../app/page",
    "./notifications/send",
    "./audit.router",
  ])(
    "rejects relative runtime and type-only contract edges to %s",
    (specifier) => {
      for (const prefix of ["export", "export type"])
        expect(
          isContractForbidden(
            "src/features/user/schema.ts",
            `${prefix} { Value } from "${specifier}";`,
            true,
          ),
        ).toBe(true);
    },
  );

  it("allows only the reviewed LinkRecord type-only table dependency", () => {
    for (const specifier of [
      "@/lib/db/schema/link",
      "../../../lib/db/schema/link",
    ]) {
      expect(
        isContractForbidden(
          "src/features/link/types/link.record.ts",
          `import type { link } from "${specifier}";`,
          true,
        ),
      ).toBe(false);
      expect(
        isContractForbidden(
          "src/features/link/types/link.record.ts",
          `import { link } from "${specifier}";`,
          true,
        ),
      ).toBe(true);
      expect(
        isContractForbidden(
          "src/features/link/types/link.insert.ts",
          `import type { link } from "${specifier}";`,
          true,
        ),
      ).toBe(true);
    }
    for (const target of [
      "@/lib/db/schema",
      "@/lib/db/db",
      "@/features/link/server/link-operations",
      "../../../lib/db/schema",
    ]) {
      expect(
        isContractForbidden(
          "src/features/link/types/link.record.ts",
          `import type { Value } from "${target}";`,
          true,
        ),
      ).toBe(true);
    }
  });

  it.each([
    'export type { link } from "@/lib/db/schema/link";',
    'import type { link } from "@/lib/db/schema/link"; export type { link };',
    'import type { link } from "@/lib/db/schema/link"; export { type link as table };',
    'export type * from "@/lib/db/schema/link";',
    'import type * as tables from "@/lib/db/schema/link";',
    'type Table = typeof import("@/lib/db/schema/link").link;',
    'import type { link } from "@/lib/db/schema/link"; export type { link } from "@/lib/db/schema/link";',
  ])(
    "rejects table type outlets outside the reviewed named import: %s",
    (source) => {
      expect(
        isContractForbidden(
          "src/features/link/types/link.record.ts",
          source,
          true,
        ),
      ).toBe(true);
    },
  );

  it("keeps the reviewed link table closure free of reverse feature dependencies", () => {
    const pending = ["src/lib/db/schema/link.ts"];
    const visited = new Set<string>();
    const violations: string[] = [];
    while (pending.length) {
      const path = pending.pop();
      if (!path || visited.has(path)) continue;
      visited.add(path);
      // Include type-only edges: runtime-only traversal cannot detect type cycles.
      for (const dependency of moduleDependencies(
        readFileSync(path, "utf8"),
        path,
      )) {
        const target = resolveSourceModule(path, dependency.specifier);
        if (!target) continue;
        if (target.startsWith("src/features/"))
          violations.push(`${path} -> ${target}`);
        else pending.push(target);
      }
    }
    expect(visited.size).toBeGreaterThan(1);
    expect(violations).toEqual([]);
  });

  it("rejects forbidden types on public contracts without contaminating helper runtime edges", () => {
    const source = 'import type { SQL } from "drizzle-orm";';
    expect(
      isContractForbidden("src/features/example/types.ts", source, true),
    ).toBe(true);
    expect(isContractForbidden("src/features/example/helper.ts", source)).toBe(
      false,
    );
  });

  it.each(["node:fs", "fs", "drizzle-orm", "react", "next/headers"])(
    "rejects a pure contract reaching %s through an ordinary helper",
    (specifier) => {
      const root = mkdtempSync(join(tmpdir(), "contract-boundary-"));
      try {
        expect(
          isPureContract("src/features/example/rules/example-rule.ts"),
        ).toBe(true);
        expect(
          isContractForbidden(
            "src/features/example/rules/example-rule.ts",
            `import "${specifier}";`,
          ),
        ).toBe(true);
        const rules = join(root, "rules");
        mkdirSync(rules);
        const entry = join(rules, "example-rule.ts");
        const helper = join(root, "helper.ts");
        writeFileSync(entry, 'export { value } from "../helper";');
        writeFileSync(helper, `import "${specifier}"; export const value = 1;`);
        expect(
          runtimeDependencyViolations(entry, isContractForbidden),
        ).toHaveLength(1);

        writeFileSync(helper, "export const value = 1;");
        expect(runtimeDependencyViolations(entry, isContractForbidden)).toEqual(
          [],
        );

        writeFileSync(
          helper,
          `import type { Value } from "${specifier}"; export const value = 1;`,
        );
        expect(runtimeDependencyViolations(entry, isContractForbidden)).toEqual(
          [],
        );

        writeFileSync(
          helper,
          `import "${specifier}"; export type Value = number;`,
        );
        writeFileSync(entry, 'export type { Value } from "../helper";');
        expect(runtimeDependencyViolations(entry, isContractForbidden)).toEqual(
          [],
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it("keeps all non-server feature files independent of persistence models", () => {
    expect(
      featureFiles
        .filter((path) => !/\/server(?:\/|\.ts$)/.test(path))
        .flatMap((path) =>
          moduleDependencies(readFileSync(path, "utf8"), path)
            .filter(
              (dependency) =>
                /lib\/db\/schema|drizzle-zod/.test(dependency.specifier) &&
                !isReviewedLinkTableTypeDependency(
                  path,
                  dependency,
                  readFileSync(path, "utf8"),
                ),
            )
            .map(({ specifier }) => `${path} -> ${specifier}`),
        ),
    ).toEqual([]);
  });

  it.each([
    ["src/features/post/admin/server.ts", "../../../lib/db/schema", true],
    [
      "src/features/post/public/server/query.ts",
      "../../../../lib/db/schema/post",
      true,
    ],
    ["src/features/post/shared/server.ts", "../../../lib/db/schema/post", true],
    ["src/features/post/admin/server.ts", "@/lib/db/schema/post", true],
    ["src/features/post/admin/server.ts", "drizzle-orm", true],
    ["src/features/media/admin/media-query.ts", "@/lib/trpc/outputs", true],
    [
      "src/features/media/admin/components/MediaGrid/index.tsx",
      "@/lib/trpc/outputs",
      true,
    ],
    [
      "src/features/media/admin/media-query.ts",
      "@/features/media/types/media.record",
      false,
    ],
    ["src/features/post/admin/server.ts", "../types", false],
    ["src/features/post/public/server/query.ts", "../../types", false],
    [
      "src/features/post/server/queries.ts",
      "../../../lib/db/schema/post",
      false,
    ],
  ] as const)(
    "checks UI database edges from %s to %s",
    (path, specifier, forbidden) => {
      for (const prefix of ["import", "import type"])
        expect(
          featureUiDependencyViolations(
            path,
            `${prefix} { Model } from "${specifier}";`,
          ),
        ).toEqual(forbidden ? [`${path} -> ${specifier}`] : []);
    },
  );

  it("keeps feature UI independent of ORM/database contracts", () => {
    expect(
      featureFiles.filter((path) =>
        path.startsWith("src/features/media/admin/"),
      ).length,
    ).toBeGreaterThan(0);
    const violations = featureFiles.flatMap((path) =>
      featureUiDependencyViolations(path, readFileSync(path, "utf8")),
    );
    expect(violations).toEqual([]);
  });
});
