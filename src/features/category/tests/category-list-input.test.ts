import { describe, expect, it } from "vitest";
import { CategoryListQuerySchema } from "@/features/category/schema/category.list.schema";
import type { CategoryListInput } from "@/features/category/types/category.list";
import {
  apiPaginationDefaults,
  repositoryPaginationDefaults,
} from "@/lib/validation/pagination";

// Object literals must accept every supported filter without requiring pagination.
const pathFilter: CategoryListInput = { path: "articles" };
const omittedPagination: CategoryListInput = {};
// @ts-expect-error Unknown filters must not become accepted through an index signature.
const unknownFilter: CategoryListInput = { unknown: "articles" };

describe("category list input contract", () => {
  it("preserves path normalization and optional pagination", () => {
    expect(CategoryListQuerySchema.parse({ path: "  articles  " })).toEqual({
      ...pathFilter,
      page: 1,
      limit: 10,
      sortField: "updatedAt",
      sortOrder: "desc",
    });
    expect(CategoryListQuerySchema.parse(omittedPagination)).toEqual({
      page: 1,
      limit: 10,
      sortField: "updatedAt",
      sortOrder: "desc",
    });
    expect(CategoryListQuerySchema.parse({ path: "  " }).path).toBeUndefined();
    expect(unknownFilter).toEqual({ unknown: "articles" });
  });

  it("keeps API and repository sorting defaults distinct", () => {
    expect(apiPaginationDefaults.sortField).toBe("updatedAt");
    expect(repositoryPaginationDefaults.sortField).toBe("createdAt");
  });
});
