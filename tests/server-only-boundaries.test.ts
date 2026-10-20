import { readFileSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const serverOnlyEntrypoints = [
  "src/auth.ts",
  "src/app/_auth/auth-hooks.ts",
  "src/app/_auth/auth-request-audit.ts",
  "src/env/server.ts",
  "src/lib/db/db.ts",
  "src/lib/observability/server/index.ts",
  "src/lib/observability/server/registry.ts",
  "src/app/_trpc/router.ts",
  "src/lib/trpc/context.ts",
  "src/lib/trpc/core.ts",
  "src/app/_trpc/server.ts",
  "src/features/comment/router.ts",
  "src/features/post/router.ts",
  "src/features/media/router.ts",
  "src/features/link/router.ts",
  "src/features/menu/router.ts",
  "src/features/page/router.ts",
  "src/features/setting/router.ts",
  "src/features/setting/statistic.router.ts",
  "src/features/tag/router.ts",
  "src/features/user/router.ts",
  "src/features/user/account-security.router.ts",
  "src/features/category/router.ts",
  "src/lib/storage/S3.ts",
  "src/lib/rate-limit/rate-limit.ts",
  "src/features/comment/notifications/comment-email.ts",
  "src/features/comment/notifications/comment-delivery.ts",
  "src/lib/cache/upstash-cache.ts",
  "src/lib/security/validate-captcha.ts",
] as const;

function findBackendModules(directory: string): string[] {
  return readdirSync(resolve(process.cwd(), directory), {
    recursive: true,
    withFileTypes: true,
  })
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name === "router.ts" ||
          entry.name === "server.ts" ||
          entry.name.endsWith(".router.ts") ||
          entry.name.endsWith(".service.ts")),
    )
    .map((entry) => {
      const parent = entry.parentPath.replace(`${process.cwd()}/`, "");
      return `${parent}/${entry.name}`;
    });
}

describe("server-only module boundaries", () => {
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
      "src/features/user/user.ts",
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
