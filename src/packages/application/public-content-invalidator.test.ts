import { describe, expect, it, vi } from "vitest";
import {
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

  it("端口保持最小固定方法集合", async () => {
    const invalidator: PublicContentInvalidator = {
      invalidateContent: vi.fn(async () => undefined),
      invalidateAll: vi.fn(async () => undefined),
    };

    await invalidator.invalidateAll();

    expect(Object.keys(invalidator).sort()).toEqual([
      "invalidateAll",
      "invalidateContent",
    ]);
  });
});
