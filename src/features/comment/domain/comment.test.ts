import { describe, expect, it } from "vitest";
import { CommentStatus } from "@/packages/domain/content/comment";
import { InvalidStateTransitionError } from "@/packages/domain/core/domain-error";
import { CommentAggregate } from "./comment";

describe("CommentAggregate", () => {
  it("允许审核并发布领域事件", () => {
    const comment = CommentAggregate.rehydrate("comment-1", CommentStatus.TO_AUDIT);
    comment.moderate(CommentStatus.PUBLISH);
    expect(comment.currentStatus).toBe(CommentStatus.PUBLISH);
    expect(comment.pullEvents()[0]).toMatchObject({ name: "comment.moderated", payload: { from: CommentStatus.TO_AUDIT, to: CommentStatus.PUBLISH } });
  });

  it("拒绝非法状态流转", () => {
    const comment = CommentAggregate.rehydrate("comment-1", CommentStatus.RUBBISH);
    expect(() => comment.moderate(CommentStatus.BAN)).toThrow(InvalidStateTransitionError);
  });
});
