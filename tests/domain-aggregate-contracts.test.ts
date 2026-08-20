import { describe, expect, it, vi } from "vitest";
import { CommentStatus } from "@/packages/domain/content/comment";
import { PostStatus } from "@/packages/domain/content/post-status";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { CommentAggregate } from "@/features/comment/domain/comment";
import { PostAggregate } from "@/features/post/domain/post";
import { UserAggregate } from "@/features/user/domain/user";

describe("核心聚合 fake repository 契约", () => {
  it("Comment 聚合可在无数据库环境完成审核状态机", () => {
    const save = vi.fn();
    const aggregate = CommentAggregate.rehydrate("comment-1", CommentStatus.TO_AUDIT);
    aggregate.moderate(CommentStatus.PUBLISH);
    save({ id: aggregate.id, status: aggregate.currentStatus });
    expect(save).toHaveBeenCalledWith({ id: "comment-1", status: CommentStatus.PUBLISH });
    expect(aggregate.pullEvents()).toHaveLength(1);
  });

  it("Post 聚合可在无数据库环境完成发布和撤回", () => {
    const save = vi.fn();
    const aggregate = PostAggregate.rehydrate("post-1", PostStatus.DRAFT);
    aggregate.publish();
    save({ id: aggregate.id, status: aggregate.currentStatus });
    aggregate.withdraw();
    save({ id: aggregate.id, status: aggregate.currentStatus });
    expect(save).toHaveBeenNthCalledWith(1, { id: "post-1", status: PostStatus.PUBLISHED });
    expect(save).toHaveBeenNthCalledWith(2, { id: "post-1", status: PostStatus.DRAFT });
    expect(aggregate.pullEvents()).toHaveLength(2);
  });

  it("User 聚合可在 fake actor 下保护管理员账号", () => {
    const aggregate = UserAggregate.rehydrate("user-1", UserStatus.ENABLE, UserLevel.EDITOR);
    aggregate.changeStatus(UserStatus.DISABLE, UserLevel.ADMIN);
    expect(aggregate.currentStatus).toBe(UserStatus.DISABLE);
    expect(aggregate.pullEvents()).toHaveLength(1);
  });
});
