import { readFileSync, rmSync } from "node:fs";
import { sourceFiles } from "@tests/helpers/source-files";
import {
  moduleDependencies,
  resolveSourceModule,
} from "@tests/helpers/architecture-imports";
import { resolve } from "node:path";
import { runTestProcess } from "@tests/helpers/run-test-process";

import { describe, expect, it } from "vitest";

const serverOnlyEntrypoints = [
  "src/auth.ts",
  "src/app/lib/server/sitemap-data.ts",
  "src/app/auth/auth-hooks.ts",
  "src/app/auth/auth-request-audit.ts",
  "src/env/server.ts",
  "src/lib/db/db.ts",
  "src/lib/observability/server/index.ts",
  "src/lib/observability/server/registry.ts",
  "src/app/trpc/router.ts",
  "src/lib/trpc/context.ts",
  "src/lib/trpc/core.ts",
  "src/app/trpc/server.ts",
  "src/features/comment/router.ts",
  "src/features/post/router.ts",
  "src/features/media/router.ts",
  "src/features/link/router.ts",
  "src/features/menu/router.ts",
  "src/features/page/router.ts",
  "src/features/setting/router.ts",
  "src/features/dashboard/router.ts",
  "src/features/tag/router.ts",
  "src/features/user/router.ts",
  "src/features/user/account-security.router.ts",
  "src/features/category/router.ts",
  "src/lib/storage/r2-storage.ts",
  "src/lib/rate-limit/rate-limit.ts",
  "src/features/comment/notifications/comment-email.ts",
  "src/features/comment/notifications/comment-delivery.ts",
  "src/lib/cache/upstash-cache.ts",
  "src/lib/security/validate-captcha.ts",
] as const;

function requiresServerBoundary(path: string, source: string): boolean {
  if (/(?:^|\/|\.)router\.ts$/.test(path)) return true;
  if (!/\/server\//.test(path)) return false;
  return moduleDependencies(source, path).some(({ specifier, typeOnly }) => {
    if (typeOnly) return false;
    if (
      specifier === "server-only" ||
      /^drizzle-|^@\/lib\/(?:db\/(?:db|schema)|storage|auth)/.test(specifier)
    )
      return true;
    const target = resolveSourceModule(path, specifier);
    return (
      !!target &&
      /^import\s+["']server-only["'];?/m.test(readFileSync(target, "utf8"))
    );
  });
}

function findBackendModules(directory: string): string[] {
  return sourceFiles(directory).filter((path) =>
    requiresServerBoundary(path, readFileSync(path, "utf8")),
  );
}

describe("server-only module boundaries", () => {
  it("discovers named server operations and ignores type-only persistence helpers", () => {
    expect(
      requiresServerBoundary(
        "src/features/future/server/future-queries.ts",
        'import { eq } from "drizzle-orm";',
      ),
    ).toBe(true);
    expect(
      requiresServerBoundary(
        "src/features/future/server/future-translations.ts",
        'import type { Database } from "@/lib/db/db";',
      ),
    ).toBe(false);
    expect(
      requiresServerBoundary(
        "src/features/future/types/future.record.ts",
        "export type Record = string;",
      ),
    ).toBe(false);
  });

  const protectedModules = [
    ...new Set([
      ...serverOnlyEntrypoints,
      ...findBackendModules("src/features"),
    ]),
  ];

  it.each(protectedModules)("%s declares the server-only boundary", (path) => {
    const source = readFileSync(resolve(process.cwd(), path), "utf8");

    expect(source).toMatch(/^import\s+["']server-only["'];?/m);
  });

  it("keeps shared contracts free of the server-only boundary", () => {
    const sharedContracts = [
      "src/features/user/types/user.status.ts",
      "src/lib/validation/validation.ts",
      "src/lib/validation/pagination.ts",
    ];

    for (const path of sharedContracts) {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");
      expect(source).not.toMatch(/\bimport\s+["']server-only["']/);
    }
  });

  it("keeps tRPC context independent of Node request storage", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/trpc/context.ts"),
      "utf8",
    );

    expect(source).not.toContain("node-request-context");
    expect(source).not.toContain("node:async_hooks");
  });

  it("keeps the shared request context Edge-safe", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/observability/server/request-context.ts"),
      "utf8",
    );

    expect(source).not.toContain("node-request-context");
    expect(source).not.toContain("node:async_hooks");
    expect(source).not.toMatch(/\bimport\s+["']server-only["']/);
  });

  it("makes Next.js reject a Client Component importing observability/server", async () => {
    const fixture = resolve(
      process.cwd(),
      "tests/fixtures/server-only-client-import",
    );
    try {
      const result = await runTestProcess(
        process.execPath,
        [resolve("node_modules/next/dist/bin/next"), "build", fixture],
        {
          cwd: process.cwd(),
          // Preserve the original 60-second outer budget, leaving cleanup time.
          timeout: 55_000,
          env: {
            ...process.env,
            NEXT_TELEMETRY_DISABLED: "1",
          },
        },
      );
      const output = `${result.stdout}\n${result.stderr}`;
      expect(result.status).not.toBe(0);
      expect(output).toMatch(
        /cannot be imported from a Client Component module.*Server Component/is,
      );
    } finally {
      rmSync(resolve(fixture, ".next"), { recursive: true, force: true });
    }
  }, 60_000);
});
