import { describe, expect, it } from "vitest";
import { CommentStatus } from "@/packages/domain/content/comment";
import {
  buildPublicCommentTree,
  toPublicComment,
} from "./comment-public-dto";
import type { CommentRecord } from "./repository";

function comment(
  id: string,
  parentId: string | null,
): CommentRecord {
  return {
    id,
    author: "Visitor",
    content: "Hello",
    site: null,
    email: "visitor@example.test",
    parentId,
    postId: "post-1",
    pageId: null,
    customId: null,
    status: CommentStatus.PUBLISH,
    createdAt: null,
    updatedAt: null,
    userAgent: "private agent",
    ip: "203.0.113.10",
  };
}

describe("public comment DTO", () => {
  it("保留被封禁评论的树位置但清空其公开内容", () => {
    const banned = toPublicComment({
      ...comment("banned", "root"),
      status: CommentStatus.BAN,
    });

    expect(banned.parentId).toBe("root");
    expect(banned.content).toBe("");
  });

  it("保留父子树并隐藏父评论不可见的孤儿回复", () => {
    const tree = buildPublicCommentTree([
      toPublicComment(comment("root", null)),
      toPublicComment(comment("child", "root")),
      toPublicComment(comment("orphan", "hidden-parent")),
    ]);

    expect(tree.map(({ id }) => id)).toEqual(["root"]);
    expect(tree[0]?.children?.map(({ id }) => id)).toEqual(["child"]);
    expect(tree[0]).not.toHaveProperty("email");
    expect(tree[0]).not.toHaveProperty("ip");
    expect(tree[0]).not.toHaveProperty("userAgent");
  });
});
