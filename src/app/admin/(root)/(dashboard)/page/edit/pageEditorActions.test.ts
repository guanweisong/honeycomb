import { describe, expect, it, vi } from "vitest";

import { PageStatus } from "@/packages/trpc/api/modules/page/types/page.status";
import { PageTemplate } from "@/packages/trpc/api/modules/page/types/page.template";
import { submitPageEditor } from "./pageEditorActions";

const values = {
  title: { en: "About", zh: "关于" },
  content: { en: "English", zh: "中文" },
  template: PageTemplate.DEFAULT,
};

describe("page editor action state", () => {
  it("creates with the requested status and returns the new page id", async () => {
    const create = vi.fn().mockResolvedValue({ id: "page-created" });

    await expect(
      submitPageEditor({
        pageId: undefined,
        values,
        status: PageStatus.DRAFT,
        create,
        update: vi.fn(),
      }),
    ).resolves.toEqual({ state: "created", id: "page-created" });
    expect(create).toHaveBeenCalledWith({
      ...values,
      status: PageStatus.DRAFT,
    });
  });

  it("updates the existing id and reports mutation failures without redirecting", async () => {
    const update = vi.fn().mockRejectedValue(new Error("network unavailable"));

    await expect(
      submitPageEditor({
        pageId: "page-42",
        values,
        status: PageStatus.PUBLISHED,
        create: vi.fn(),
        update,
      }),
    ).resolves.toEqual({ state: "error" });
    expect(update).toHaveBeenCalledWith({
      id: "page-42",
      ...values,
      status: PageStatus.PUBLISHED,
    });
  });
});
