import { describe, expect, it } from "vitest";

import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { toPageInsertValues, toPageUpdateValues } from "./page-transforms";

describe("page command transforms", () => {
  it("keeps translated fields out of parent insert values", () => {
    const values = toPageInsertValues(
      {
        title: { en: "<b>About</b>", zh: "<b>关于</b>" },
        content: {
          en: '<p>Safe</p><script>alert("x")</script>',
          zh: '<img src="javascript:alert(1)"><p>安全</p>',
        },
        status: PageStatus.DRAFT,
        template: PageTemplate.DEFAULT,
      },
      "author-1",
    );

    expect(values).not.toHaveProperty("title");
    expect(values).not.toHaveProperty("content");
  });

  it("omits absent content during partial updates", () => {
    expect(toPageUpdateValues({ title: { en: "About", zh: "关于" } }))
      .toEqual({});
  });

  it("keeps and sanitizes explicitly provided empty content", () => {
    expect(toPageUpdateValues({ content: { en: "", zh: "" } })).toEqual({});
  });
});
