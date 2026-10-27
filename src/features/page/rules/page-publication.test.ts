// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PageStatus } from "@/features/page/types/page.status";
import {
  getPagePublishStatus,
  getPageWithdrawStatus,
} from "@/features/page/rules/page-publication";

describe("page publication rules", () => {
  it.each([PageStatus.DRAFT, PageStatus.TO_AUDIT])("publishes %s", (status) => {
    expect(getPagePublishStatus("page-1", status)).toBe(PageStatus.PUBLISHED);
  });
  it("withdraws a published page", () => {
    expect(getPageWithdrawStatus("page-1", PageStatus.PUBLISHED)).toBe(
      PageStatus.DRAFT,
    );
  });
  it.each([
    [getPagePublishStatus, PageStatus.PUBLISHED, "页面已经发布"],
    [getPageWithdrawStatus, PageStatus.DRAFT, "只有已发布页面可以撤回"],
    [getPageWithdrawStatus, PageStatus.TO_AUDIT, "只有已发布页面可以撤回"],
  ])("rejects an invalid transition", (transition, current, message) => {
    expect(() => transition("page-1", current)).toThrow(
      expect.objectContaining({ code: "INVALID_STATE_TRANSITION", message }),
    );
  });
  it.each([getPagePublishStatus, getPageWithdrawStatus])(
    "validates status before id and id before transitions",
    (transition) => {
      expect(() => transition(" ", undefined)).toThrow(
        expect.objectContaining({ code: "MISSING_PAGE_STATUS" }),
      );
      expect(() => transition(" ", "UNKNOWN")).toThrow(
        expect.objectContaining({
          code: "INVALID_PAGE_STATUS",
          message: "页面当前状态不合法",
        }),
      );
      expect(() => transition(" ", PageStatus.DRAFT)).toThrow(
        "聚合标识不能为空",
      );
    },
  );
});
