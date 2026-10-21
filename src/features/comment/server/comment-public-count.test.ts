// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createCommentQueryRepository } from "./comment-query-repository";
import { CommentStatus } from "@/features/comment/comment-status";
import * as schema from "@/lib/db/schema";
import { MenuType } from "@/features/menu/menu-types";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

describe("public comment count", () => {
  it("counts all fetched rows without a second query, including banned and orphan replies", async () => {
    const db = createMockDb();
    const base = {
      author: "Reader",
      email: "reader@example.com",
      site: "",
      content: "Comment",
      status: CommentStatus.PUBLISH,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    db.query.comment.findMany.mockResolvedValue([
      { ...base, id: "root", parentId: null },
      { ...base, id: "reply", parentId: "root" },
      { ...base, id: "banned", parentId: "root", status: CommentStatus.BAN },
      { ...base, id: "orphan", parentId: "missing" },
    ]);

    const result = await createCommentQueryRepository(
      asMockDatabase(db),
    ).listPublicByRef({ id: "post", type: MenuType.CATEGORY });

    expect(result.total).toBe(4);
    expect(result.list).toHaveLength(1);
    expect(result.list[0]?.children).toHaveLength(2);
    expect(
      result.list[0]?.children?.find((item) => item.id === "banned")?.content,
    ).toBe("");
    expect(JSON.stringify(result)).not.toContain("reader@example.com");
    expect(db.query.comment.findMany).toHaveBeenCalledTimes(1);
    // The select builder is an embedded visibility subquery, not a separate count request.
    expect(db.select).toHaveBeenCalledOnce();
    expect(db.select).toHaveBeenCalledWith({ id: schema.post.id });
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("returns zero from an empty result without a count query", async () => {
    const db = createMockDb();
    db.query.comment.findMany.mockResolvedValue([]);
    const result = await createCommentQueryRepository(
      asMockDatabase(db),
    ).listPublicByRef({ id: "page", type: MenuType.PAGE });
    expect(result).toEqual({ list: [], total: 0 });
    expect(db.select).toHaveBeenCalledOnce();
    expect(db.select).toHaveBeenCalledWith({ id: schema.page.id });
    expect(db.execute).not.toHaveBeenCalled();
  });
});
