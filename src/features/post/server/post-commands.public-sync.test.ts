import {
  createPost,
  destroyPosts,
  updatePost,
} from "@/features/post/server/post-commands";
import { PostStatus } from "@/features/post/types/post.status";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import * as schema from "@/lib/db/schema";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { describe, expect, it, vi } from "vitest";

const mockBumpCacheVersion = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
vi.mock("@/lib/cache/upstash-cache", () => ({
  bumpCacheVersion: mockBumpCacheVersion,
}));
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.test" },
}));
describe("required persistence results", () => {
  const invalidator = {
    invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
  };
  function authorize(db: ReturnType<typeof createMockDb>) {
    db.from.mockImplementation((table: object) => {
      if (table === schema.user) {
        const actor = createMockDb();
        actor.limit.mockResolvedValue([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
        return Object.assign(Promise.resolve([]), actor);
      }
      if (
        table === schema.postTranslation ||
        table === schema.settingTranslation ||
        table === schema.pageTranslation
      ) {
        const read = createMockDb();
        read.where.mockResolvedValue([]);
        return read;
      }
      return db;
    });
  }
  const creationToken = "11111111-1111-4111-8111-111111111111";
  it("uses only the explicit invalidator for post public synchronization", async () => {
    const db = createMockDb();
    authorize(db);
    db.returning.mockResolvedValue([{ id: "post", version: 1 }]);
    db.limit.mockResolvedValue([
      { id: "post", version: 0, status: PostStatus.DRAFT },
    ]);
    const database = asMockDatabase(db);
    invalidator.invalidate.mockClear();

    await createPost(
      database,
      { categoryId: "category", creationToken },
      "author",
      invalidator,
    );
    await updatePost(
      database,
      { id: "507f1f77bcf86cd799439011", expectedVersion: 0, movieTime: null },
      "author",
      invalidator,
    );
    await destroyPosts(
      database,
      { items: [{ id: "507f1f77bcf86cd799439011", expectedVersion: 0 }] },
      "author",
      invalidator,
    );
    await updatePost(
      database,
      { id: "507f1f77bcf86cd799439011", expectedVersion: 0, movieActorIds: [] },
      "author",
      invalidator,
    );

    expect(invalidator.invalidate).toHaveBeenCalledTimes(4);
    expect(mockBumpCacheVersion).not.toHaveBeenCalled();
  });
});
