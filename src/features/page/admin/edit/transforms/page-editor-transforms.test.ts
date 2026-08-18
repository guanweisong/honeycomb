import { describe, expect, it } from "vitest";

import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";
import {
  getPageEditorId,
  toPageEditorFormValues,
} from "./page-editor-transforms";

describe("page editor transforms", () => {
  it("preserves the id query parameter used by the existing edit route", () => {
    expect(getPageEditorId(new URLSearchParams("id=page-42"))).toBe("page-42");
    expect(getPageEditorId(new URLSearchParams())).toBeNull();
  });

  it("maps an admin detail DTO to the existing form defaults", () => {
    expect(
      toPageEditorFormValues({
        title: { en: "About", zh: "关于" },
        content: { en: "English", zh: "中文" },
        status: PageStatus.PUBLISHED,
        template: null,
      }),
    ).toEqual({
      title: { en: "About", zh: "关于" },
      content: { en: "English", zh: "中文" },
      status: PageStatus.PUBLISHED,
      template: PageTemplate.DEFAULT,
    });
  });

  it("keeps absent detail distinguishable from an empty edit form", () => {
    expect(toPageEditorFormValues(null)).toBeUndefined();
  });
});
