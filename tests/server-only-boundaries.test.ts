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
  "src/packages/trpc/api/app-router.ts",
  "src/packages/trpc/api/context.ts",
  "src/packages/trpc/api/core.ts",
  "src/packages/trpc/api/default-context.ts",
  "src/packages/trpc/api/index.ts",
  "src/features/comment/transport/comment.router.ts",
  "src/features/post/transport/post.router.ts",
  "src/features/media/transport/media.router.ts",
  "src/features/link/transport/link.router.ts",
  "src/features/menu/transport/menu.router.ts",
  "src/features/page/transport/page.router.ts",
  "src/features/setting/transport/setting.router.ts",
  "src/features/setting/transport/statistic.router.ts",
  "src/features/tag/transport/tag.router.ts",
  "src/features/user/transport/user.router.ts",
  "src/features/user/transport/account-security.router.ts",
  "src/features/category/transport/category.router.ts",
  "src/packages/infrastructure/storage/S3.ts",
  "src/packages/infrastructure/rate-limit/rate-limit.ts",
  "src/features/comment/notifications/comment-email.ts",
  "src/features/comment/notifications/comment-delivery.ts",
  "src/packages/infrastructure/cache/upstash-cache.ts",
  "src/packages/infrastructure/security/validate-captcha.ts",
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
