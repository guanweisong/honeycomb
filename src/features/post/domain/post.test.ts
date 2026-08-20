import { describe, expect, it } from "vitest";
import { PostStatus } from "@/packages/domain/content/post-status";
import { InvalidStateTransitionError } from "@/packages/domain/core/domain-error";
import { PostAggregate } from "./post";

describe("PostAggregate", () => {
  it("支持草稿发布和发布事件", () => {
    const post = PostAggregate.rehydrate("post-1", PostStatus.DRAFT);
    post.publish();
    expect(post.currentStatus).toBe(PostStatus.PUBLISHED);
    expect(post.pullEvents()[0]).toMatchObject({ name: "post.published" });
  });

  it("支持撤回并拒绝重复发布", () => {
    const post = PostAggregate.rehydrate("post-1", PostStatus.PUBLISHED);
    post.withdraw();
    expect(post.currentStatus).toBe(PostStatus.DRAFT);
    expect(() => post.publish()).not.toThrow();
    expect(() => PostAggregate.rehydrate("post-2", PostStatus.PUBLISHED).publish()).toThrow(InvalidStateTransitionError);
  });
});
