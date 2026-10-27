import { describe, expect, it } from "vitest";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";

describe("bounded write contracts", () => {
  it("bounds page sizes", () => {
    expect(PaginationQuerySchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(PaginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ page: 1.5 }).success).toBe(false);
  });
});

describe("唯一写入契约及边界行为", () => {
  it("保留 API 排序默认", () => {
    expect(PaginationQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortField: "updatedAt",
      sortOrder: "desc",
    });
  });
});
