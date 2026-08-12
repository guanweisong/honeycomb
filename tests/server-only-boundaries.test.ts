import { readFileSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const serverOnlyEntrypoints = [
  "src/auth.ts",
  "src/env/server.ts",
  "src/packages/infrastructure/db/db.ts",
  "src/packages/infrastructure/observability/server/index.ts",
  "src/packages/infrastructure/observability/server/registry.ts",
  "src/packages/trpc/api/appRouter.ts",
  "src/packages/trpc/api/context.ts",
  "src/packages/trpc/api/core.ts",
  "src/packages/trpc/api/defaultContext.ts",
  "src/packages/trpc/api/index.ts",
  "src/packages/trpc/api/utils/S3.ts",
  "src/packages/trpc/api/utils/rate-limit.ts",
  "src/packages/application/notifications/comment/comment-email.ts",
  "src/packages/trpc/api/utils/upstash-cache.ts",
  "src/packages/trpc/api/utils/validateCaptcha.ts",
] as const;

function findBackendModules(directory: string): string[] {
  return readdirSync(resolve(process.cwd(), directory), {
    recursive: true,
    withFileTypes: true,
  })
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith(".router.ts") ||
          entry.name.endsWith(".service.ts")),
    )
    .map((entry) => {
      const parent = entry.parentPath.replace(`${process.cwd()}/`, "");
      return `${parent}/${entry.name}`;
    });
}

describe("server-only module boundaries", () => {
  const protectedModules = [
    ...serverOnlyEntrypoints,
    ...findBackendModules("src/packages/trpc/api/modules"),
  ];

  it.each(protectedModules)("%s declares the server-only boundary", (path) => {
    const source = readFileSync(resolve(process.cwd(), path), "utf8");

    expect(source).toMatch(/^import "server-only";/);
  });

  it("keeps shared contracts free of the server-only boundary", () => {
    const sharedContracts = [
      "src/packages/domain/identity/user.ts",
      "src/packages/trpc/api/schemas/i18n.schema.ts",
      "src/packages/trpc/api/types/content-visibility.ts",
    ];

    for (const path of sharedContracts) {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");
      expect(source).not.toContain('import "server-only"');
    }
  });

  it("keeps tRPC context independent of Node request storage", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/packages/trpc/api/context.ts"),
      "utf8",
    );

    expect(source).not.toContain("node-request-context");
    expect(source).not.toContain("node:async_hooks");
  });

  it("keeps the shared request context Edge-safe", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/packages/infrastructure/observability/server/request-context.ts",
      ),
      "utf8",
    );

    expect(source).not.toContain("node-request-context");
    expect(source).not.toContain("node:async_hooks");
    expect(source).not.toContain('import "server-only"');
  });

  it("makes Next.js reject a Client Component importing observability/server", () => {
    const fixture = resolve(
      process.cwd(),
      "tests/fixtures/server-only-client-import",
    );
    const result = spawnSync("bun", ["next", "build", fixture], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
      },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    rmSync(resolve(fixture, ".next"), { recursive: true, force: true });

    expect(result.status).not.toBe(0);
    expect(output).toMatch(
      /cannot be imported from a Client Component module.*Server Component/is,
    );
  }, 60_000);
});
