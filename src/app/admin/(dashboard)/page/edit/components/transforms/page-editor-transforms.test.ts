import { describe, expect, it } from "vitest";

import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import { toPageEditorFormValues } from "@/app/admin/(dashboard)/page/edit/components/transforms/page-editor-transforms";

describe("page editor transforms", () => {
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
