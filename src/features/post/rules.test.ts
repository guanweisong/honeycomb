// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PostStatus } from "@/features/post/types/post.status";
import { getPostPublishStatus, getPostWithdrawStatus } from "./rules";

describe("post publication rules", () => {
  it.each([PostStatus.DRAFT, PostStatus.TO_AUDIT])("publishes %s", (status) => {
    expect(getPostPublishStatus("post-1", status)).toBe(PostStatus.PUBLISHED);
  });
  it("withdraws a published post", () => {
    expect(getPostWithdrawStatus("post-1", PostStatus.PUBLISHED)).toBe(
      PostStatus.DRAFT,
    );
  });
  it.each([
    [getPostPublishStatus, PostStatus.PUBLISHED, "文章已经发布"],
    [getPostWithdrawStatus, PostStatus.DRAFT, "只有已发布文章可以撤回"],
    [getPostWithdrawStatus, PostStatus.TO_AUDIT, "只有已发布文章可以撤回"],
  ])("rejects an invalid transition", (transition, current, message) => {
    expect(() => transition("post-1", current)).toThrow(
      expect.objectContaining({ code: "INVALID_STATE_TRANSITION", message }),
    );
  });
  it.each([getPostPublishStatus, getPostWithdrawStatus])(
    "validates status before id and id before transitions",
    (transition) => {
      expect(() => transition(" ", undefined)).toThrow(
        expect.objectContaining({ code: "MISSING_POST_STATUS" }),
      );
      expect(() => transition(" ", "UNKNOWN")).toThrow(
        expect.objectContaining({
          code: "INVALID_POST_STATUS",
          message: "文章当前状态不合法",
        }),
      );
      expect(() => transition(" ", PostStatus.DRAFT)).toThrow(
        "聚合标识不能为空",
      );
    },
  );
});
