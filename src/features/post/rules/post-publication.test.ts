// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PostStatus } from "@/features/post/types/post.status";
import { assertPublicationStatusChange } from "@/lib/validation/publication-status";

describe("post publication rules", () => {
  const transition = (id: string, current: PostStatus, next?: PostStatus) =>
    assertPublicationStatusChange(id, current, next, PostStatus, "post");

  it.each([PostStatus.DRAFT, PostStatus.TO_AUDIT])("publishes %s", (status) => {
    expect(() =>
      transition("post-1", status, PostStatus.PUBLISHED),
    ).not.toThrow();
  });

  it("withdraws a published record and accepts a same-state patch", () => {
    expect(() =>
      transition("post-1", PostStatus.PUBLISHED, PostStatus.DRAFT),
    ).not.toThrow();
    expect(() =>
      transition("post-1", PostStatus.PUBLISHED, PostStatus.PUBLISHED),
    ).not.toThrow();
    expect(() => transition("post-1", PostStatus.TO_AUDIT)).not.toThrow();
  });

  it("rejects withdrawal from an unpublished record", () => {
    expect(() =>
      transition("post-1", PostStatus.TO_AUDIT, PostStatus.DRAFT),
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_STATE_TRANSITION",
        message: "只有已发布文章可以撤回",
      }),
    );
  });

  it("rejects an unsupported status and a blank ID for a transition", () => {
    expect(() =>
      transition(" ", PostStatus.DRAFT, PostStatus.TO_AUDIT),
    ).toThrow(expect.objectContaining({ code: "INVALID_POST_STATUS" }));
    expect(() =>
      transition(" ", PostStatus.DRAFT, PostStatus.PUBLISHED),
    ).toThrow("聚合标识不能为空");
  });
});
