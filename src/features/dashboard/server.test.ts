import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import * as schema from "@/lib/db/schema";
import { getStatistics } from "@/features/dashboard/server/dashboard-queries";
import { observeDbOperation } from "@/lib/observability/server";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: vi.fn(
    (_name: string, _kind: string, operation: () => unknown) => operation(),
  ),
}));

describe("dashboard statistics", () => {
  it("preserves counts, enum order, author fallback, DTO fields and operation names", async () => {
    vi.clearAllMocks();
    const db = createMockDb();
    db.select.mockImplementation((selection) => {
      if (selection?.id && selection?.name) {
        return {
          from: vi.fn().mockResolvedValue([
            { id: "named", name: "Named user" },
            { id: "unnamed", name: null },
            { id: "empty-name", name: "" },
            { id: "no-posts", name: "No posts" },
          ]),
        };
      }
      if (selection?.item) {
        const rows =
          selection.item === schema.post.type
            ? [
                { item: "MOVIE", count: 3 },
                { item: "ARTICLE", count: "2" },
                { item: "QUOTE", count: "invalid" },
              ]
            : selection.item === schema.user.level
              ? [
                  { item: "EDITOR", count: "4" },
                  { item: "ADMIN", count: 1 },
                ]
              : [
                  { item: "BAN", count: 5 },
                  { item: "RUBBISH", count: "6" },
                  { item: "PUBLISH", count: 7 },
                  { item: "TO_AUDIT", count: 8 },
                ];
        return { from: () => ({ groupBy: async () => rows }) };
      }
      return db;
    });
    for (const count of ["2", 3, null, "invalid", 1, "4", 0, 8, 7, "6", 5]) {
      db.where.mockResolvedValueOnce([{ count }]);
    }
    db.groupBy.mockResolvedValue([
      { authorId: "named", count: "9" },
      { authorId: "unnamed", count: "2" },
      { authorId: "empty-name", count: "invalid" },
      { authorId: "absent-user", count: "100" },
    ]);

    const result = await getStatistics(asMockDatabase(db));
    expect(result).toEqual({
      postType: [
        { item: "ARTICLE", count: 2 },
        { item: "MOVIE", count: 3 },
        { item: "PHOTOGRAPH", count: 0 },
        { item: "QUOTE", count: 0 },
      ],
      userType: [
        { item: "ADMIN", count: 1 },
        { item: "EDITOR", count: 4 },
        { item: "GUEST", count: 0 },
      ],
      commentStatus: [
        { item: "TO_AUDIT", count: 8 },
        { item: "PUBLISH", count: 7 },
        { item: "RUBBISH", count: 6 },
        { item: "BAN", count: 5 },
      ],
      userPost: [
        { item: "Named user", count: 9 },
        { item: "unnamed", count: 2 },
        { item: "", count: 0 },
        { item: "No posts", count: 0 },
      ],
    });
    expect(db.select).toHaveBeenCalledTimes(5);
    expect(
      vi
        .mocked(observeDbOperation)
        .mock.calls.map(([name, kind]) => [name, kind]),
    ).toEqual([
      ["statistics.posts-by-type", "select"],
      ["statistics.users-by-level", "select"],
      ["statistics.comments-by-status", "select"],
      ["statistics.user-list", "select"],
      ["statistics.posts-by-author", "select"],
    ]);
  });

  it("preserves zero counts when count queries return no rows", async () => {
    const db = createMockDb();
    db.select.mockImplementation((selection) =>
      selection?.id && selection?.name
        ? { from: vi.fn().mockResolvedValue([]) }
        : db,
    );
    db.where.mockResolvedValue([]);
    db.groupBy.mockResolvedValue([]);
    const result = await getStatistics(asMockDatabase(db));
    expect(
      [...result.postType, ...result.userType, ...result.commentStatus].map(
        ({ count }) => count,
      ),
    ).toEqual(Array(11).fill(0));
    expect(result.userPost).toEqual([]);
  });
});
