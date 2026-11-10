import { updatePost } from "@/features/post/server/post-commands";
import {
  listCategories,
  getCategoryTree,
} from "@/features/category/server/category-queries";
import {
  createCategory,
  updateCategory,
} from "@/features/category/server/category-commands";
import { listPosts } from "@/features/post/server/post-queries";
import { readFileSync } from "node:fs";
import type { Client } from "@libsql/client/node";
import { withTestDatabase } from "@tests/helpers/local-test-database";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import { aroundEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";

import { createUserRepository } from "@/features/user/server/user-repository";

import { destroyUsers } from "@/features/user/server/user-commands";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { TagType } from "@/features/tag/types/tag.type";
import { MultiLangEnum } from "@/lib/i18n/i18n";

const categoryValues = (id: string, parent?: string) => ({
  id,
  parent,
  path: id,
});
const categoryInput = (id: string, parent?: string) => ({
  ...categoryValues(id, parent),
  title: { en: id, zh: id },
  description: { en: id, zh: id },
});
vi.mock("@/lib/cache/upstash-cache", () => ({
  bumpCacheVersion: async () => {},
}));
const invalidator = {
  invalidate: async () => ({ state: "completed" as const }),
};

describe("relational integrity with real libSQL", () => {
  let client: Client;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  aroundEach((runTest) =>
    withTestDatabase(async (localClient) => {
      client = localClient;
      db = drizzle(client, { schema });
      await migrate(db, { migrationsFolder: "drizzle" });
      await db
        .insert(schema.category)
        .values([
          categoryValues("root"),
          categoryValues("child", "root"),
          categoryValues("grandchild", "child"),
        ]);
      await db.insert(schema.categoryTranslation).values(
        ["root", "child", "grandchild"].flatMap((categoryId) => [
          {
            categoryId,
            locale: MultiLangEnum.En,
            title: categoryId,
            description: categoryId,
          },
          {
            categoryId,
            locale: MultiLangEnum.Zh,
            title: categoryId,
            description: categoryId,
          },
        ]),
      );
      await runTest();
    }),
  );

  it("includes grandchildren in ancestor post filters", async () => {
    await db
      .insert(schema.user)
      .values({ id: "author", name: "Author", email: "author@example.test" });
    await db.insert(schema.category).values(categoryValues("outside"));
    await db.insert(schema.post).values(
      ["root", "child", "grandchild", "outside"].map((categoryId) => ({
        id: `post-${categoryId}`,
        categoryId,
        authorId: "author",
      })),
    );
    const result = await listPosts(
      db,
      { categoryId: "root", limit: 100 },
      "ALL",
    );
    expect(result.list.map(({ id }) => id).sort()).toEqual([
      "post-child",
      "post-grandchild",
      "post-root",
    ]);
    expect(result.total).toBe(3);
  });
  it("returns a complete tree separately from a conventional flat page", async () => {
    const page = await listCategories(
      db,
      { page: 2, limit: 1, sortField: "path", sortOrder: "asc" },
      "ALL",
    );
    expect(page.list.map(({ id }) => id)).toEqual(["grandchild"]);
    expect(page.total).toBe(3);
    const tree = await getCategoryTree(db, "ALL");
    expect(tree.list.map(({ id }) => id)).toEqual([
      "root",
      "child",
      "grandchild",
    ]);
    expect(tree.list.map(({ deepPath }) => deepPath)).toEqual([0, 1, 2]);
  });
  it("maps a racing duplicate path to the friendly application error", async () => {
    await expect(
      createCategory(
        db,
        {
          ...categoryInput("other"),
          path: "root",
        },
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      db
        .insert(schema.category)
        .values({ ...categoryValues("direct"), path: "root" }),
    ).rejects.toThrow();
  });
  it("prevents opposite reparenting after one side is updated", async () => {
    await db
      .insert(schema.category)
      .values([categoryValues("a"), categoryValues("b")]);

    await updateCategory(db, { id: "a", parent: "b" }, invalidator);
    await expect(
      updateCategory(db, { id: "b", parent: "a" }, invalidator),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      updateCategory(db, { id: "root", parent: "grandchild" }, invalidator),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("rejects a cycle introduced after the parent preflight but before its write", async () => {
    await db
      .insert(schema.category)
      .values([categoryValues("race-a"), categoryValues("race-b")]);
    const transaction = db.transaction.bind(db);
    const transactionSpy = vi
      .spyOn(db, "transaction")
      .mockImplementationOnce((callback, config) =>
        transaction(async (tx) => {
          // Model the other writer committing after this operation read race-b.
          await tx
            .update(schema.category)
            .set({ parent: "race-a" })
            .where(eq(schema.category.id, "race-b"));
          return callback(tx);
        }, config),
      );
    const invalidate = vi.fn(async () => ({ state: "completed" as const }));
    try {
      await expect(
        updateCategory(db, { id: "race-a", parent: "race-b" }, { invalidate }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(invalidate).not.toHaveBeenCalled();
      // The rejected transaction rolls back both the simulated race and write.
      const rows = await db
        .select({ id: schema.category.id, parent: schema.category.parent })
        .from(schema.category);
      expect(rows.find(({ id }) => id === "race-a")?.parent).toBeNull();
    } finally {
      transactionSpy.mockRestore();
    }
  });
  it("de-duplicates tags and rejects direct duplicate associations", async () => {
    await db.insert(schema.user).values({
      id: "author",
      name: "Author",
      email: "author@example.com",
      level: UserLevel.ADMIN,
      status: UserStatus.ENABLE,
    });
    await db.insert(schema.post).values({
      id: "507f1f77bcf86cd799439011",
      categoryId: "root",
      authorId: "author",
    });
    await db.insert(schema.tag).values(
      ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"].map((id) => ({
        id,
      })),
    );
    await updatePost(
      db,
      {
        id: "507f1f77bcf86cd799439011",
        expectedVersion: 0,
        movieActorIds: [
          "507f1f77bcf86cd799439012",
          "507f1f77bcf86cd799439012",
          "507f1f77bcf86cd799439013",
        ],
      },
      "author",
      invalidator,
    );
    expect(
      (await db.select().from(schema.postTag)).map(({ tagId }) => tagId),
    ).toEqual(["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]);
    await expect(
      db.insert(schema.postTag).values({
        postId: "507f1f77bcf86cd799439011",
        tagId: "507f1f77bcf86cd799439012",
        type: TagType.ACTOR,
      }),
    ).rejects.toThrow();
  });
  it("migration fails with actionable duplicate path diagnostics without renaming paths", async () => {
    await client.execute("DROP INDEX category_path_idx");
    await client.execute("CREATE INDEX category_path_idx ON category(path)");
    await db
      .insert(schema.category)
      .values({ ...categoryValues("duplicate"), path: "root" });
    const migration = readFileSync(
      "drizzle/0001_sticky_shatterstar.sql",
      "utf8",
    );
    await expect(client.executeMultiple(migration)).rejects.toThrow(
      /duplicate category paths/i,
    );
    expect(
      await db
        .select()
        .from(schema.category)
        .where(eq(schema.category.path, "root")),
    ).toHaveLength(2);
  });
  it("migration deterministically collapses duplicate post/tag/type rows", async () => {
    await client.execute("DROP INDEX post_tag_post_tag_type_unique");
    await client.execute("PRAGMA foreign_keys = OFF");
    await client.execute(
      "INSERT INTO post_tag (post_id, tag_id, type) VALUES ('p', 't', 'ACTOR'), ('p', 't', 'ACTOR'), ('p', 't', 'DIRECTOR')",
    );
    await client.executeMultiple(
      readFileSync("drizzle/0001_sticky_shatterstar.sql", "utf8"),
    );
    expect(
      (await db.select().from(schema.postTag)).map(({ type }) => type).sort(),
    ).toEqual(["ACTOR", "DIRECTOR"]);
  });
  it("rejects the entire deletion batch when a competing promotion commits before the write transaction", async () => {
    await db.insert(schema.user).values(
      ["promoted", "guest"].map((id) => ({
        id,
        name: id,
        email: `${id}@example.com`,
        level: UserLevel.GUEST,
      })),
    );
    const repository = createUserRepository(db);
    await expect(
      destroyUsers(
        {
          ...repository,
          destroy: async (ids) => {
            await db
              .update(schema.user)
              .set({ level: UserLevel.ADMIN })
              .where(eq(schema.user.id, "promoted"));
            return repository.destroy(ids);
          },
        },
        ["promoted", "guest"],
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "PROTECTED_USER" });
    expect(
      (await db.select().from(schema.user)).map(({ id }) => id).sort(),
    ).toEqual(["guest", "promoted"]);
  });
});
