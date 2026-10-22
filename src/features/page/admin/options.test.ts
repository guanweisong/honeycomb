// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PageTemplateName } from "@/features/page/types/page.template-name";
import { pageTemplateOptions, pageStatusOptions } from "./options";
import { PageStatusName } from "@/features/page/types/page.status-name";

describe("page display options", () => {
  it("preserves page status labels and option order", () => {
    expect(PageStatusName).toEqual({
      PUBLISHED: "已发布",
      DRAFT: "草稿",
      TO_AUDIT: "待审核",
    });
    expect(pageStatusOptions).toEqual([
      { label: "已发布", value: "PUBLISHED" },
      { label: "草稿", value: "DRAFT" },
      { label: "待审核", value: "TO_AUDIT" },
    ]);
  });

  it("preserves page template labels and option order", () => {
    expect(PageTemplateName).toEqual({
      DEFAULT: "默认",
      FRIENDLY_LINKS: "友情链接",
    });
    expect(pageTemplateOptions).toEqual([
      { label: "默认", value: "default" },
      { label: "友情链接", value: "friendly-links" },
    ]);
  });
});
