import { describe, expect, it, vi } from "vitest";
import {
  PublicCacheInvalidationPlanSchema,
  PublicContentReferenceSchema,
  type PublicContentInvalidator,
} from "./public-content-invalidator";

describe("PublicContentInvalidator", () => {
  it("只接受服务端结构化公开内容引用", () => {
    const reference = {
      id: "507f1f77bcf86cd799439011",
      type: "post",
    } as const;

    expect(PublicContentReferenceSchema.parse(reference)).toEqual(reference);
    expect(() =>
      PublicContentReferenceSchema.parse({ id: "short", type: "page" }),
    ).toThrow();
    expect(() =>
      PublicContentReferenceSchema.parse({
        id: reference.id,
        type: "other",
      }),
    ).toThrow();
  });

  it("只接受结构化失效范围并保持单一端口方法", async () => {
    expect(
      PublicCacheInvalidationPlanSchema.parse({
        contents: [
          { id: "507f1f77bcf86cd799439011", type: "post" },
        ],
        refreshLayout: true,
        refreshPostIndex: true,
        refreshSitemap: true,
      }),
    ).toMatchObject({ refreshLayout: true, refreshPostIndex: true });
    expect(() =>
      PublicCacheInvalidationPlanSchema.parse({ path: "/admin" }),
    ).toThrow();

    const invalidator: PublicContentInvalidator = {
      invalidate: vi.fn(async () => undefined),
    };

    await invalidator.invalidate({ refreshLayout: true });

    expect(Object.keys(invalidator)).toEqual(["invalidate"]);
  });

  it("拒绝没有任何实际目标的失效计划", () => {
    for (const plan of [
      {},
      { contents: [] },
      { refreshLayout: false },
      { refreshPostIndex: false },
      { refreshSitemap: false },
    ]) {
      expect(() => PublicCacheInvalidationPlanSchema.parse(plan)).toThrow();
    }
  });
});
