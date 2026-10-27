import { toPublicCommentSource } from "@/features/comment/server/comment-dto";
import type { CommentRecord } from "@/features/comment/types/comment.read-model";
import { CommentStatus } from "@/features/comment/types/comment.status";
import * as schema from "@/lib/db/schema";
import { describe, expect, it } from "vitest";
import { buildPublicCommentTree, toPublicComment } from "@/features/comment/server/comment-public-dto";

function comment(id: string, parentId: string | null): CommentRecord {
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
  it.each([
    ["visitor@example.test", "b6321d878decf6402a73283b5f41c0e6"],
    ["  MyEmailAddress@example.com\t", "0bc83cb571cd1c50ba6f3e8a78ef1346"],
    ["用户@例子.测试", "a774d3b64afcc982c0e0329406f2a252"],
    ["É@example.test", "327fae09cb8c0765c7e485f8aa78224e"],
    [" \t\n", "d41d8cd98f00b204e9800998ecf8427e"],
  ])("保留邮箱 %j 的 Cravatar 地址和公开字段白名单", (email, hash) => {
    expect(toPublicComment({ ...comment("root", null), email })).toEqual({
      id: "root",
      author: "Visitor",
      content: "Hello",
      site: null,
      parentId: null,
      status: CommentStatus.PUBLISH,
      createdAt: null,
      avatar: `https://cravatar.cn/avatar/${hash}?s=48&d=identicon`,
    });
  });

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
describe("required persistence results", () => {
  const commentRow: typeof schema.comment.$inferSelect = {
    id: "comment",
    author: "author",
    content: "text",
    site: null,
    email: "a@test.dev",
    parentId: null,
    postId: "post",
    pageId: null,
    customId: null,
    status: "UNKNOWN",
    createdAt: null,
    updatedAt: null,
    userAgent: null,
    ip: null,
  };
  it("rejects invalid status in public comment data", () => {
    expect(() => toPublicComment(toPublicCommentSource(commentRow))).toThrow(
      expect.objectContaining({ code: "INTERNAL_SERVER_ERROR" }),
    );
  });
});
