// @vitest-environment node

import { describe, expect, it } from "vitest";
import { CommentStatus } from "@/features/comment/comment-status";
import { PostStatus } from "@/features/post/post-status";
import { UserLevel } from "@/features/user/user";
import { assertCommentTransition } from "@/features/comment/rules";
import {
  getPostPublishStatus,
  getPostWithdrawStatus,
} from "@/features/post/rules";
import { assertUserStatusChange } from "@/features/user/rules";

describe("pure feature business rules", () => {
  it("moderates a comment without a database", () => {
    expect(() =>
      assertCommentTransition(
        "comment-1",
        CommentStatus.TO_AUDIT,
        CommentStatus.PUBLISH,
      ),
    ).not.toThrow();
    expect(() =>
      assertCommentTransition(
        "comment-1",
        CommentStatus.PUBLISH,
        CommentStatus.TO_AUDIT,
      ),
    ).toThrow("评论不能从");
  });
  it("publishes and withdraws a post without a database", () => {
    const published = getPostPublishStatus("post-1", PostStatus.DRAFT);
    expect(published).toBe(PostStatus.PUBLISHED);
    expect(getPostWithdrawStatus("post-1", published)).toBe(PostStatus.DRAFT);
    expect(() => getPostPublishStatus("post-1", PostStatus.PUBLISHED)).toThrow(
      "文章已经发布",
    );
    expect(() => getPostWithdrawStatus("post-1", PostStatus.DRAFT)).toThrow(
      "只有已发布文章可以撤回",
    );
  });
  it("authorizes user status changes against the actor", () => {
    expect(() =>
      assertUserStatusChange("user-1", UserLevel.EDITOR, UserLevel.ADMIN),
    ).not.toThrow();
    expect(() =>
      assertUserStatusChange("admin", UserLevel.ADMIN, UserLevel.EDITOR),
    ).toThrow("非管理员不能修改管理员账号");
  });
});
