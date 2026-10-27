import { describe, expect, it } from "vitest";
import { LinkInsertSchema } from "@/features/link/schemas/link.insert.schema";
import { EnableStatus } from "@/lib/validation/enable-status";

describe("唯一写入契约及边界行为", () => {
  it("状态写入契约保留 EnableStatus 字面量", () => {
    expect(
      LinkInsertSchema.parse({
        url: "https://example.test",
        name: "Example",
        logo: "https://example.test/logo.png",
        status: EnableStatus.ENABLE,
      }).status,
    ).toBe(EnableStatus.ENABLE);
  });
});
