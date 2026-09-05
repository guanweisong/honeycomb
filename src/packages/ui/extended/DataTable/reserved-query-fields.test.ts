import { expect, it } from "vitest";
import { normalizeDataTableParams } from "./useDataTableState";

it("过滤器不能伪造分页或排序字段的类型", () => {
  const result = normalizeDataTableParams({
    pagination: false,
    paginationState: { page: 1, limit: 20 },
    sorting: [],
    columnFilters: [
      { id: "page", value: "invalid" },
      { id: "sortOrder", value: 42 },
      { id: "status", value: ["PUBLISHED"] },
    ],
  });
  expect(result).toEqual({ status: ["PUBLISHED"] });
});
