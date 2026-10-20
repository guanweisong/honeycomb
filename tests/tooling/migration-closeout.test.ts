// @vitest-environment node

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("simple feature architecture closeout", () => {
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
