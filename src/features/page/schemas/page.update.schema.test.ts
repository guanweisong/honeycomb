// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PageUpdateSchema } from "@/features/page/schemas/page.update.schema";
import { PageTemplate } from "@/features/page/types/page.template";

const fields = {
  title: { zh: "标题", en: "Title" },
  content: { zh: "正文", en: "Content" },
  template: PageTemplate.DEFAULT,
};
describe("page editor revision input", () => {
  it("requires a version and actual editable field", () => {
    expect(
      PageUpdateSchema.safeParse({
        id: "507f1f77bcf86cd799439011",
        title: fields.title,
      }).success,
    ).toBe(false);
    expect(
      PageUpdateSchema.safeParse({
        id: "507f1f77bcf86cd799439011",
        expectedVersion: 0,
      }).success,
    ).toBe(false);
    expect(
      PageUpdateSchema.safeParse({
        id: "507f1f77bcf86cd799439011",
        expectedVersion: 0,
        title: fields.title,
      }).success,
    ).toBe(true);
  });
});
