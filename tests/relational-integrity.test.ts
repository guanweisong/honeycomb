import { readFileSync, readdirSync } from "node:fs";
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/packages/infrastructure/db/schema";
import { createCategoryRepository } from "@/features/category/infrastructure/category-repository";
import { createPostQueryRepository } from "@/features/post/infrastructure/post-query-repository";
import { createPostCommandRepository } from "@/features/post/infrastructure/post-command-repository";
import { createUserRepository } from "@/features/user/infrastructure/user-repository";
import { updateCategory } from "@/features/category/application/category-use-cases";
import { destroyUsers } from "@/features/user/application/user-commands";
import { UserLevel } from "@/packages/domain/identity/user";
import { TagType } from "@/packages/domain/content/tag";

const categoryValues = (id: string, parent?: string) => ({
  id,
  parent,
  path: id,
  title: { en: id, zh: id },
  description: { en: id, zh: id },
});
vi.mock("@/packages/infrastructure/cache/upstash-cache", () => ({
  bumpCacheVersion: async () => {},
}));
const invalidator = {
  invalidate: async () => {},
  invalidateAll: async () => {},
};

describe("relational integrity with real libSQL", () => {
  let client: ReturnType<typeof createClient>;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  beforeEach(async () => {
    client = createClient({ url: ":memory:" });
    db = drizzle(client, { schema });
    for (const file of readdirSync("drizzle")
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      await client.executeMultiple(readFileSync(`drizzle/${file}`, "utf8"));
    }
    await db
      .insert(schema.category)
      .values([
        categoryValues("root"),
        categoryValues("child", "root"),
        categoryValues("grandchild", "child"),
      ]);
  });
  afterEach(() => client.close());

  it("includes grandchildren in ancestor post filters", async () => {
    expect(await createPostQueryRepository(db).categoryFilter("root")).toEqual([
      "root",
      "child",
      "grandchild",
    ]);
  });
  it("returns a complete tree separately from a conventional flat page", async () => {
    const repository = createCategoryRepository(db);
    const page = await repository.list(
      { page: 2, limit: 1, sortField: "path", sortOrder: "asc" },
      "ALL",
    );
    expect(page.list.map(({ id }) => id)).toEqual(["grandchild"]);
    expect(page.total).toBe(3);
    const tree = await repository.tree("ALL");
    expect(tree.list.map(({ id }) => id)).toEqual([
      "root",
      "child",
      "grandchild",
    ]);
    expect(tree.list.map(({ deepPath }) => deepPath)).toEqual([0, 1, 2]);
  });
  it("maps a racing duplicate path to the friendly application error", async () => {
    await expect(
      createCategoryRepository(db).create({
        ...categoryValues("other"),
        path: "root",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      db
        .insert(schema.category)
        .values({ ...categoryValues("direct"), path: "root" }),
    ).rejects.toThrow();
  });
  it("prevents concurrent opposite reparenting even after both pre-checks pass", async () => {
    await db
      .insert(schema.category)
      .values([categoryValues("a"), categoryValues("b")]);
    const repository = createCategoryRepository(db);
    const outcomes = await Promise.allSettled([
      repository.update({ id: "a", parent: "b" }),
      repository.update({ id: "b", parent: "a" }),
    ]);
    expect(
      outcomes.filter(({ status }) => status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = outcomes.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({ reason: { code: "BAD_REQUEST" } });
    await expect(
      updateCategory(
        repository,
        { id: "root", parent: "grandchild" },
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("de-duplicates tags and rejects direct duplicate associations", async () => {
    await db
      .insert(schema.user)
      .values({ id: "author", name: "Author", email: "author@example.com" });
    await db
      .insert(schema.post)
      .values({ id: "post", categoryId: "root", authorId: "author" });
    await db
      .insert(schema.tag)
      .values(["tagA", "tagB"].map((id) => ({ id, name: { en: id, zh: id } })));
    await createPostCommandRepository(db).updateTags({
      postId: "post",
      tagIds: ["tagA", "tagA", "tagB"],
      type: TagType.ACTOR,
    });
    expect(
      (await db.select().from(schema.postTag)).map(({ tagId }) => tagId),
    ).toEqual(["tagA", "tagB"]);
    await expect(
      db
        .insert(schema.postTag)
        .values({ postId: "post", tagId: "tagA", type: TagType.ACTOR }),
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
  it("rejects the entire deletion batch when a target is promoted after the application pre-read", async () => {
    await db
      .insert(schema.user)
      .values(
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
          getStates: async (ids) => {
            const states = await repository.getStates(ids);
            await db
              .update(schema.user)
              .set({ level: UserLevel.ADMIN })
              .where(eq(schema.user.id, "promoted"));
            return states;
          },
        },
        ["promoted", "guest"],
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(
      (await db.select().from(schema.user)).map(({ id }) => id).sort(),
    ).toEqual(["guest", "promoted"]);
  });
});
