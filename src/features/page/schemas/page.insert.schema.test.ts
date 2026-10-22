// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PageInsertSchema } from "@/features/page/schemas/page.insert.schema";
import { PageTemplate } from "@/features/page/types/page.template";

const fields = {
  title: { zh: "标题", en: "Title" },
  content: { zh: "正文", en: "Content" },
  template: PageTemplate.DEFAULT,
};
describe("page editor revision input", () => {
  it("requires creation token without relaxing bilingual fields", () => {
    expect(PageInsertSchema.safeParse(fields).success).toBe(false);
    expect(
      PageInsertSchema.safeParse({
        ...fields,
        creationToken: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
    expect(
      PageInsertSchema.safeParse({
        ...fields,
        title: { en: "Only" },
        creationToken: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(false);
  });
});

describe("content command enum schemas", () => {
  const page = {
    title: { en: "About", zh: "关于" },
    content: { en: "Content", zh: "内容" },
    creationToken: "1d40d08b-55cc-4c2c-9dc0-6b151b9866f4",
    status: "PUBLISHED",
    template: PageTemplate.DEFAULT,
  };

  it.each([
    ["status", "VISIBLE"],
    ["template", "UNKNOWN"],
  ])("rejects only the invalid page %s", (field, value) => {
    const result = PageInsertSchema.safeParse({ ...page, [field]: value });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected enum rejection");
    expect(result.error.issues.map((issue) => issue.path)).toEqual([[field]]);
  });
});
