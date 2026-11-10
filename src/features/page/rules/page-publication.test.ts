// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PageStatus } from "@/features/page/types/page.status";
import { assertPublicationStatusChange } from "@/lib/validation/publication-status";

describe("page publication rules", () => {
  const transition = (id: string, current: PageStatus, next?: PageStatus) =>
    assertPublicationStatusChange(id, current, next, PageStatus, "page");

  it.each([PageStatus.DRAFT, PageStatus.TO_AUDIT])("publishes %s", (status) => {
    expect(() =>
      transition("page-1", status, PageStatus.PUBLISHED),
    ).not.toThrow();
  });

  it("withdraws a published record and accepts a same-state patch", () => {
    expect(() =>
      transition("page-1", PageStatus.PUBLISHED, PageStatus.DRAFT),
    ).not.toThrow();
    expect(() =>
      transition("page-1", PageStatus.PUBLISHED, PageStatus.PUBLISHED),
    ).not.toThrow();
    expect(() => transition("page-1", PageStatus.TO_AUDIT)).not.toThrow();
  });

  it("rejects withdrawal from an unpublished record", () => {
    expect(() =>
      transition("page-1", PageStatus.TO_AUDIT, PageStatus.DRAFT),
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_STATE_TRANSITION",
        message: "只有已发布页面可以撤回",
      }),
    );
  });

  it("rejects an unsupported status and a blank ID for a transition", () => {
    expect(() =>
      transition(" ", PageStatus.DRAFT, PageStatus.TO_AUDIT),
    ).toThrow(expect.objectContaining({ code: "INVALID_PAGE_STATUS" }));
    expect(() =>
      transition(" ", PageStatus.DRAFT, PageStatus.PUBLISHED),
    ).toThrow("聚合标识不能为空");
  });
});
