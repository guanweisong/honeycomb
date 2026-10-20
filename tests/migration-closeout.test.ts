// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const coreContracts = [
  "src/features/post/types.ts",
  "src/features/page/types.ts",
  "src/features/comment/types.ts",
  "src/features/comment/schema.ts",
  "src/features/user/types.ts",
];

describe("simple feature architecture closeout", () => {
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
      "src/lib/auth/migration.ts",
      "src/lib/content/parser/get-relation-tags.ts",
      "src/lib/db/array-field.ts",
      "src/lib/observability/adapters/memory.ts",
      "src/lib/observability/adapters/noop.ts",
      "src/lib/trpc/capability-authorization-sources.ts",
      "src/lib/trpc/capability-authorization-static.ts",
      "src/lib/trpc/capability-procedure-matrix-data.ts",
      "src/lib/trpc/capability-procedure-matrix-fixtures.ts",
      "src/lib/trpc/capability-procedure-matrix-test-helpers.ts",
      "src/components/ui/card.tsx",
      "src/app/admin/constants/admin-action-guard-matrix.ts",
    ];

    expect(retiredProductionPaths.filter(existsSync)).toEqual([]);
  });
});
