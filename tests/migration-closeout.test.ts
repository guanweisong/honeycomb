import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const coreContracts = [
  "src/features/post/application/repository.ts",
  "src/features/page/application/repository.ts",
  "src/features/comment/application/repository.ts",
  "src/features/comment/application/comment-use-cases.ts",
  "src/features/user/application/ports.ts",
];

describe("DDD migration closeout", () => {
  it("does not expose explicit any from core feature contracts", () => {
    const violations = coreContracts.flatMap((relativePath) => {
      const source = readFileSync(relativePath, "utf8");
      return /\bany\b|no-explicit-any/.test(source) ? [relativePath] : [];
    });

    expect(violations).toEqual([]);
  });

  it("does not retain retired or test-only modules in production source", () => {
    const retiredProductionPaths = [
      "src/app/(blog)/i18n/middleware.ts",
      "src/app/api/trpc/[trpc]/config.ts",
      "src/features/post/post-filters.ts",
      "src/packages/identity/auth/migration.ts",
      "src/packages/infrastructure/content/parser/get-relation-tags.ts",
      "src/packages/infrastructure/db/array-field.ts",
      "src/packages/infrastructure/observability/adapters/memory.ts",
      "src/packages/infrastructure/observability/adapters/noop.ts",
      "src/packages/trpc/api/capability-authorization-sources.ts",
      "src/packages/trpc/api/capability-authorization-static.ts",
      "src/packages/trpc/api/capability-procedure-matrix-data.ts",
      "src/packages/trpc/api/capability-procedure-matrix-fixtures.ts",
      "src/packages/trpc/api/capability-procedure-matrix-test-helpers.ts",
      "src/packages/ui/components/card.tsx",
      "src/app/admin/constants/admin-action-guard-matrix.ts",
    ];

    expect(retiredProductionPaths.filter(existsSync)).toEqual([]);
  });
});
