import { describe, expect, it, vi } from "vitest";
import { CommentStatus } from "@/features/comment/comment-status";
import { PostStatus } from "@/features/post/post-status";
import { UserLevel, UserStatus } from "@/features/user/user";
import { assertCommentTransition } from "@/features/comment/rules";
import {
  getPostPublishStatus,
  getPostWithdrawStatus,
} from "@/features/post/rules";
import { assertUserStatusChange } from "@/features/user/rules";

describe("pure feature business rules", () => {
  it("moderates a comment without a database", () => {
    const save = vi.fn();
    assertCommentTransition(
      "comment-1",
      CommentStatus.TO_AUDIT,
      CommentStatus.PUBLISH,
    );
    save({ id: "comment-1", status: CommentStatus.PUBLISH });
    expect(save).toHaveBeenCalledWith({
      id: "comment-1",
      status: CommentStatus.PUBLISH,
    });
  });
  it("publishes and withdraws a post without a database", () => {
    const save = vi.fn();
    const published = getPostPublishStatus("post-1", PostStatus.DRAFT);
    save({ id: "post-1", status: published });
    save({ id: "post-1", status: getPostWithdrawStatus("post-1", published) });
    expect(save).toHaveBeenNthCalledWith(1, {
      id: "post-1",
      status: PostStatus.PUBLISHED,
    });
    expect(save).toHaveBeenNthCalledWith(2, {
      id: "post-1",
      status: PostStatus.DRAFT,
    });
  });
  it("authorizes user status changes against the actor", () => {
    const save = vi.fn();
    assertUserStatusChange("user-1", UserLevel.EDITOR, UserLevel.ADMIN);
    save({ id: "user-1", status: UserStatus.DISABLE });
    expect(save).toHaveBeenCalledWith({
      id: "user-1",
      status: UserStatus.DISABLE,
    });
    expect(() =>
      assertUserStatusChange("admin", UserLevel.ADMIN, UserLevel.EDITOR),
    ).toThrow("非管理员不能修改管理员账号");
  });
});
