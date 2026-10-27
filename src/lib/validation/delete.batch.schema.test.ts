import { describe, expect, it } from "vitest";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";

describe("共享契约的真实消费者", () => {
  it("批量删除拒绝空 ID 集合", () => {
    const id = "123456789012345678901234";
    expect(DeleteBatchSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(DeleteBatchSchema.parse({ ids: [id] })).toEqual({
      ids: [id],
    });
  });
});

describe("bounded write contracts", () => {
  it("bounds destructive batches", () => {
    const ids = Array.from({ length: 101 }, (_, i) =>
      String(i).padStart(24, "0"),
    );
    expect(DeleteBatchSchema.safeParse({ ids }).success).toBe(false);
    expect(
      DeleteBatchSchema.safeParse({ ids: ids.slice(0, 100) }).success,
    ).toBe(true);
  });
});
