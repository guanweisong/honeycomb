// @vitest-environment node

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import ts from "typescript";
import { sourceFiles } from "@tests/helpers/source-files";
import { isDisplayContract } from "@tests/helpers/feature-inventory";
import {
  isContractForbidden,
  localModulePath,
  moduleDependencies,
  runtimeDependencyViolations,
  resolveSourceModule,
} from "@tests/helpers/architecture-imports";

function libraryImportViolations(path: string, source: string) {
  return moduleDependencies(source, path).flatMap(({ specifier, typeOnly }) => {
    const target = localModulePath(path, specifier);
    if (!target) return [];
    if (target.startsWith("src/app/")) {
      return typeOnly &&
        path.startsWith("src/lib/trpc/") &&
        target === "src/app/_trpc/router"
        ? []
        : [`${path} -> ${specifier}`];
    }
    if (target.startsWith("src/components/"))
      return [`${path} -> ${specifier}`];
    if (!target.startsWith("src/features/")) return [];
    // Only technical identity/persistence bindings need feature-owned data.
    const dataConsumer = /^src\/lib\/(?:auth|db|trpc)\//.test(path);
    const implementation =
      /\/(?:server|admin|public|components|notifications|presentation)(?:\/|$)|(?:\/|\.)router$/.test(
        target,
      );
    return dataConsumer && !implementation && !isDisplayContract(target)
      ? []
      : [`${path} -> ${specifier}`];
  });
}

/** Comments are trivia; only top-level directive-prologue strings define clients. */
function isClientEntry(source: string) {
  const file = ts.createSourceFile(
    "entry.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  for (const statement of file.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    )
      return false;
    if (statement.expression.text === "use client") return true;
  }
  return false;
}

function isBrowserEntry(path: string, source: string) {
  return path === "src/instrumentation-client.ts" || isClientEntry(source);
}

function isBrowserForbidden(path: string, source: string) {
  return (
    /import\s*["']server-only["']/.test(source) ||
    /^src\/lib\/(?:db|storage|rate-limit)\//.test(path) ||
    /^src\/app\/_trpc\//.test(path) ||
    /\/(?:server|notifications)(?:\/|\.tsx?$)/.test(path) ||
    moduleDependencies(source, path).some(
      ({ specifier, typeOnly }) =>
        !typeOnly &&
        (/^(?:node:|bun:|@libsql\/|@aws-sdk\/|@sentry\/node|next\/(?:headers|cache|server)$|resend$|better-auth$)/.test(
          specifier,
        ) ||
          builtinModules.includes(specifier)),
    )
  );
}

describe("technical library and browser dependency boundaries", () => {
  it.each([
    ['"use client"; export const View = () => null;', true],
    ['// License header\n"use client"; export const View = () => null;', true],
    [
      '/* License header */\n"use client"; export const View = () => null;',
      true,
    ],
    [
      '"use strict"; /* comment */ "use client"; export const View = () => null;',
      true,
    ],
    ['const value = 1; "use client";', false],
    ['import "./dependency"; "use client";', false],
    ['function nested() { "use client"; }', false],
    ['// "use client"\nexport const View = () => null;', false],
    ['"use client" + " suffix";', false],
  ])("recognizes client directive prologues: %s", (source, expected) => {
    expect(isClientEntry(source)).toBe(expected);
  });

  it("discovers framework browser instrumentation without a client directive", () => {
    const source = 'import "node:fs";';
    const entries = [
      "src/instrumentation-client.ts",
      "src/instrumentation.ts",
      "src/features/example/instrumentation-client.ts",
    ].filter((path) => isBrowserEntry(path, source));
    expect(entries).toEqual(["src/instrumentation-client.ts"]);
    expect(entries.filter((path) => isBrowserForbidden(path, source))).toEqual([
      "src/instrumentation-client.ts",
    ]);
  });

  it("recognizes static, type-only, re-export, dynamic and require dependencies", () => {
    expect(
      moduleDependencies(
        [
          'import type { Router } from "@/app/_trpc/router";',
          'import { type User } from "@/features/user/types/user.current";',
          'import { type User, save } from "./mixed";',
          'export type { Input } from "./types";',
          'export { execute } from "./server";',
          'const lazy = import("./lazy");',
          'const native = require("node:fs");',
          'import sqlite = require("@libsql/client");',
          "const templated = import(`./templated`);",
        ].join("\n"),
      ),
    ).toEqual([
      { specifier: "@/app/_trpc/router", typeOnly: true },
      { specifier: "@/features/user/types/user.current", typeOnly: true },
      { specifier: "./mixed", typeOnly: false },
      { specifier: "./types", typeOnly: true },
      { specifier: "./server", typeOnly: false },
      { specifier: "./lazy", typeOnly: false },
      { specifier: "node:fs", typeOnly: false },
      { specifier: "@libsql/client", typeOnly: false },
      { specifier: "./templated", typeOnly: false },
    ]);
  });

  it("detects business runtime imports even when hidden behind relative paths or re-exports", () => {
    expect(
      libraryImportViolations(
        "src/lib/auth/hooks.ts",
        [
          'export { recordLogin } from "../../features/user/server/history";',
          'const operation = import("@/features/user/server/operation");',
          'import type { Operation } from "@/features/user/server/operation";',
        ].join("\n"),
      ),
    ).toHaveLength(3);
    expect(
      libraryImportViolations(
        "src/lib/auth/hooks.ts",
        'export { save } from "@/features/user/server";',
      ),
    ).toHaveLength(1);
    expect(
      libraryImportViolations(
        "src/lib/trpc/client/trpc.ts",
        'export { appRouter } from "../../../app/_trpc/router";',
      ),
    ).toHaveLength(1);
    expect(
      libraryImportViolations(
        "src/lib/trpc/client/trpc.ts",
        'import { appRouter } from "@/app/_trpc/router";',
      ),
    ).toHaveLength(1);
    expect(
      libraryImportViolations(
        "src/lib/trpc/client/trpc.ts",
        'import type { AppRouter } from "@/app/_trpc/router";',
      ),
    ).toEqual([]);
    expect(
      libraryImportViolations(
        "src/lib/db/schema/auth.ts",
        'import { UserStatus } from "@/features/user/types/user.status";',
      ),
    ).toEqual([]);
  });

  it("rejects display enums in persistence and identity bindings", () => {
    for (const path of [
      "src/lib/db/schema/content-post.ts",
      "src/lib/auth/hooks.ts",
      "src/lib/trpc/context.ts",
    ])
      expect(
        libraryImportViolations(
          path,
          'import { PostStatusName } from "@/features/post/types/post.status-name";',
        ),
      ).toHaveLength(1);
    expect(
      libraryImportViolations(
        "src/lib/db/schema/content-post.ts",
        'export { Align } from "../../../features/post/types/post-info.align";',
      ),
    ).toHaveLength(1);
  });

  it.each(["fs", "path", "drizzle-orm"])(
    "rejects %s in ordinary feature helpers admitted by the library import rule",
    (specifier) => {
      expect(
        libraryImportViolations(
          "src/lib/auth/hooks.ts",
          'import { value } from "@/features/example/helper";',
        ),
      ).toEqual([]);
      expect(
        isContractForbidden(
          "src/features/example/helper.ts",
          `import "${specifier}";`,
        ),
      ).toBe(true);
      expect(
        isContractForbidden(
          "src/features/example/helper.ts",
          `import type { Value } from "${specifier}";`,
        ),
      ).toBe(false);
    },
  );

  it("keeps lib technical and prevents runtime app/feature orchestration", () => {
    expect(
      sourceFiles("src/lib").flatMap((path) =>
        libraryImportViolations(path, readFileSync(path, "utf8")),
      ),
    ).toEqual([]);
  });

  it("keeps feature-owned data consumed by lib transitively pure", () => {
    const contracts = new Set(
      sourceFiles("src/lib").flatMap((path) =>
        moduleDependencies(readFileSync(path, "utf8"), path).flatMap(
          ({ specifier, typeOnly }) => {
            if (typeOnly) return [];
            const target = resolveSourceModule(path, specifier);
            return target?.startsWith("src/features/") ? [target] : [];
          },
        ),
      ),
    );
    expect(contracts.size).toBeGreaterThan(5);
    const violations = [...contracts].flatMap((path) => [
      ...(isContractForbidden(path, readFileSync(path, "utf8")) ? [path] : []),
      ...runtimeDependencyViolations(path, isContractForbidden),
    ]);
    expect(violations).toEqual([]);
  });

  it("puts root tRPC composition and server callers in app, not lib", () => {
    for (const path of ["src/app/_trpc/router.ts", "src/app/_trpc/server.ts"])
      expect(existsSync(path), path).toBe(true);
    for (const path of [
      "src/lib/trpc/router.ts",
      "src/lib/trpc/server.ts",
      "src/lib/trpc/api",
      "src/lib/trpc/schemas",
      "src/packages",
    ])
      expect(existsSync(path), path).toBe(false);
  });

  it("keeps generic components free of business ownership and app composition", () => {
    const violations = sourceFiles("src/components").flatMap((path) =>
      moduleDependencies(readFileSync(path, "utf8"), path).flatMap(
        ({ specifier }) => {
          const target = localModulePath(path, specifier);
          return target && /^src\/(?:features|app)\//.test(target)
            ? [`${path} -> ${specifier}`]
            : [];
        },
      ),
    );
    expect(violations).toEqual([]);
    expect(existsSync("src/features/category/admin")).toBe(true);
    expect(existsSync("src/features/media/admin/components/PhotoPicker")).toBe(
      true,
    );
    expect(
      existsSync("src/features/media/admin/components/EditorMediaProvider"),
    ).toBe(true);
  });

  it("protects every client entry from transitive server, database, SDK and Node imports", () => {
    const clients = sourceFiles("src").filter((path) =>
      isBrowserEntry(path, readFileSync(path, "utf8")),
    );
    expect(clients.length).toBeGreaterThan(50);
    expect(clients).toContain("src/instrumentation-client.ts");
    expect(clients).toContain("src/lib/auth/client.ts");
    const violations = clients.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return [
        ...(isBrowserForbidden(path, source) ? [path] : []),
        ...runtimeDependencyViolations(path, isBrowserForbidden),
      ];
    });
    expect(violations).toEqual([]);
    // Traverses every client entry and its full runtime graph. The complete V8
    // coverage run takes ~5.6s with concurrent workers, so allow instrumentation
    // overhead without excluding modules or weakening the dependency assertions.
  }, 15_000);

  it("keeps the browser auth singleton in lib without a legacy root outlet", () => {
    expect(existsSync("src/lib/auth/client.ts")).toBe(true);
    expect(existsSync("src/auth-client.ts")).toBe(false);
    expect(isClientEntry(readFileSync("src/lib/auth/client.ts", "utf8"))).toBe(
      true,
    );
  });

  it("keeps the shared observability request context transitively Edge-safe", () => {
    const path = "src/lib/observability/server/request-context.ts";
    const hasNodeDependency = (_path: string, source: string) =>
      moduleDependencies(source, _path).some(
        ({ specifier, typeOnly }) =>
          !typeOnly &&
          (specifier.startsWith("node:") ||
            builtinModules.includes(specifier) ||
            /node-request-context|@libsql\/|@aws-sdk\//.test(specifier)),
      );
    expect(hasNodeDependency(path, readFileSync(path, "utf8"))).toBe(false);
    expect(runtimeDependencyViolations(path, hasNodeDependency)).toEqual([]);
  });

  it("keeps client IP parsing free of environment and rate-limit dependencies", () => {
    expect(readFileSync("src/lib/http/client-ip.ts", "utf8")).not.toMatch(
      /@\/env|upstash|rate-limit|server-only/,
    );
  });
});
