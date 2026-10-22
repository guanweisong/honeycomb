// @vitest-environment node
import { createClient, type Client } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { existsSync, lstatSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { listPosts, listPublicPosts, getPost } from "../server/post-queries";
import {
  loadAdminPostListItems,
  loadPostRelations,
} from "../server/post-relations";
import { PostListQuerySchema } from "@/features/post/schema/post.list-query.schema";
import { destroyPosts } from "../server/post-commands";
import { PostStatus } from "@/features/post/types/post.status";
import { TagType } from "@/features/tag/types/tag.type";
import { UserLevel } from "@/features/user/types/user.level";
import { MultiLangEnum } from "@/lib/i18n/i18n";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, run: () => unknown) =>
    run(),
}));

const queries: Array<{ sql: string; params: unknown[] }> = [];
let directory: string | undefined;
let client: Client | undefined;
let db: Database;
const cleanup = () => {
  client?.close();
  client = undefined;
  if (directory) {
    rmSync(directory, { recursive: true, force: true });
    expect(existsSync(directory)).toBe(false);
    directory = undefined;
  }
};

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "honeycomb-post-queries-"));
  // The enclosing test command also installs EXIT/HUP/INT/TERM cleanup before running.
  const stat = lstatSync(directory);
  expect(stat.isSymbolicLink()).toBe(false);
  expect(stat.uid).toBe(process.getuid?.());
  const file = resolve(directory, "queries.db");
  expect(dirname(file)).toBe(directory);
  client = createClient({ url: `file:${file}` });
  db = drizzle(client, {
    schema,
    logger: { logQuery: (sql, params) => queries.push({ sql, params }) },
  });
  await migrate(db, { migrationsFolder: "drizzle" });
  await client.execute("pragma foreign_keys = on");
  await db
    .insert(schema.user)
    .values([
      { id: "author", name: "Author", level: UserLevel.ADMIN },
      { id: "other-author" },
    ]);
  await db.insert(schema.category).values([
    { id: "root", path: "root" },
    { id: "child", path: "child", parent: "root" },
    { id: "outside", path: "outside" },
  ]);
  await db.insert(schema.tag).values([{ id: "tag" }, { id: "empty-tag" }]);
  queries.length = 0;
});
afterEach(cleanup);

function postValues(
  id: string,
  extra: Partial<typeof schema.post.$inferInsert> = {},
) {
  return {
    id,
    authorId: "author",
    categoryId: "child",
    status: PostStatus.PUBLISHED,
    createdAt: "2020-01-01",
    updatedAt: "2020-01-01",
    views: 10,
    ...extra,
  };
}
async function insertPost(
  id: string,
  extra: Partial<typeof schema.post.$inferInsert> = {},
) {
  await db.insert(schema.post).values(postValues(id, extra));
}
async function tagPost(postId: string, type = TagType.ACTOR) {
  await db.insert(schema.postTag).values({ postId, tagId: "tag", type });
}

describe("post list SQL with isolated real SQLite", () => {
  it("returns empty for an unmatched tag without an unbounded preliminary relation read", async () => {
    await insertPost("post-a");
    queries.length = 0;
    expect(await listPublicPosts(db, { tagId: "empty-tag" })).toEqual({
      list: [],
      total: 0,
    });
    expect(queries).toHaveLength(2);
    expect(
      queries.every(
        ({ sql }) => sql.includes("exists") && sql.includes('"post_tag"'),
      ),
    ).toBe(true);
  });

  it("intersects descendant category, tag roles, author and publication without duplicates", async () => {
    for (const [id, extra] of [
      ["match", {}],
      ["draft", { status: PostStatus.DRAFT }],
      ["outside", { categoryId: "outside" }],
      ["other", { authorId: "other-author" }],
      ["untagged", {}],
    ] as const) {
      await insertPost(id, extra);
      if (id !== "untagged") await tagPost(id);
    }
    await tagPost("match", TagType.DIRECTOR);
    const result = await listPublicPosts(db, {
      categoryId: "root",
      tagId: "tag",
      authorId: "author",
    });
    expect(result.list.map(({ id }) => id)).toEqual(["match"]);
    expect(result.total).toBe(1);
    expect(
      await listPosts(
        db,
        { tagId: "tag", status: [PostStatus.DRAFT] },
        "PUBLISHED_ONLY",
      ),
    ).toEqual({ list: [], total: 0 });
  });

  it("filters bilingual title and body inside ID selection while hydrating only table fields", async () => {
    await insertPost("match");
    await insertPost("other");
    await db.insert(schema.postTranslation).values([
      {
        postId: "match",
        locale: MultiLangEnum.Zh,
        title: "匹配标题",
        content: "匹配正文",
      },
      {
        postId: "other",
        locale: MultiLangEnum.En,
        title: "Other title",
        content: "Other body",
      },
    ]);
    await tagPost("match");
    const filter = {
      title: "匹配",
      content: "正文",
      tagId: "tag",
      categoryId: "root",
      authorId: "author",
    };
    const admin = await listPosts(db, filter, "ALL");
    expect(admin.list.map(({ id }) => id)).toEqual(["match"]);
    expect(admin.total).toBe(1);
    const [post] = admin.list;
    if (!post) throw new Error("Expected the matching admin post");
    expect(post.title).toEqual({ zh: "匹配标题" });
    expect(post).not.toHaveProperty("content");
    expect(
      (await listPublicPosts(db, filter)).list.map(({ id }) => id),
    ).toEqual(["match"]);
    expect(
      await listPublicPosts(db, { ...filter, content: "missing" }),
    ).toEqual({ list: [], total: 0 });
  });

  it("keeps tag-filter query parameters bounded as matching associations grow", async () => {
    await insertPost("first");
    await tagPost("first");
    queries.length = 0;
    await listPublicPosts(db, { tagId: "tag", limit: 10 });
    const before = queries.find(({ sql }) =>
      sql.startsWith('select "id" from "post"'),
    );
    expect(before).toBeDefined();
    const ids = Array.from({ length: 150 }, (_, index) => `many-${index}`);
    await db.insert(schema.post).values(ids.map((id) => postValues(id)));
    await db.insert(schema.postTag).values(
      ids.flatMap((postId) =>
        [TagType.ACTOR, TagType.DIRECTOR].map((type) => ({
          postId,
          tagId: "tag",
          type,
        })),
      ),
    );
    queries.length = 0;
    const result = await listPublicPosts(db, { tagId: "tag", limit: 10 });
    const after = queries.find(({ sql }) =>
      sql.startsWith('select "id" from "post"'),
    );
    expect(result.total).toBe(151);
    expect(result.list).toHaveLength(10);
    expect(after?.params.length).toBe(before?.params.length);
    expect(queries).toHaveLength(3);
    expect(after?.sql).toContain("exists");
    if (!client || !after)
      throw new Error("Missing isolated query measurement");
    const plan = await client.execute({
      sql: `explain query plan ${after.sql}`,
      args: after.params.map((value) => String(value)),
    });
    process.stdout.write(`post-tag-query-plan ${JSON.stringify(plan.rows)}\n`);
  });

  it.each(["createdAt", "updatedAt", "views"] as const)(
    "stabilizes equal %s values across both pagination directions",
    async (sortField) => {
      for (const id of ["post-z", "post-y", "post-b", "post-a"])
        await insertPost(id);
      for (const sortOrder of ["asc", "desc"] as const) {
        queries.length = 0;
        const first = await listPublicPosts(db, {
          page: 1,
          limit: 2,
          sortField,
          sortOrder,
        });
        const second = await listPublicPosts(db, {
          page: 2,
          limit: 2,
          sortField,
          sortOrder,
        });
        expect([...first.list, ...second.list].map(({ id }) => id)).toEqual([
          "post-a",
          "post-b",
          "post-y",
          "post-z",
        ]);
        expect(first.total).toBe(4);
        expect(second.total).toBe(4);
        expect(
          new Set([...first.list, ...second.list].map(({ id }) => id)).size,
        ).toBe(4);
        const selected = queries.find(({ sql }) =>
          sql.startsWith('select "id" from "post"'),
        );
        expect(selected?.sql).toMatch(/order by .+, "post"\."id" asc limit/);
      }
    },
  );

  it("preserves explicit ID ordering and deterministic null sort values", async () => {
    for (const id of ["post-z", "post-a", "post-b"])
      await insertPost(id, { createdAt: null, updatedAt: null, views: null });
    for (const sortField of ["createdAt", "updatedAt", "views"]) {
      expect(
        (await listPosts(db, { sortField, limit: 10 }, "ALL")).list.map(
          ({ id }) => id,
        ),
      ).toEqual(["post-a", "post-b", "post-z"]);
    }
    expect(
      (
        await listPosts(db, { sortField: "id", sortOrder: "desc" }, "ALL")
      ).list.map(({ id }) => id),
    ).toEqual(["post-z", "post-b", "post-a"]);
  });

  it("preserves the distinct repository createdAt and API updatedAt defaults", async () => {
    await insertPost("older-created", {
      createdAt: "2020-01-01",
      updatedAt: "2022-01-01",
    });
    await insertPost("newer-created", {
      createdAt: "2021-01-01",
      updatedAt: "2020-01-01",
    });
    expect((await listPosts(db, {}, "ALL")).list.map(({ id }) => id)).toEqual([
      "newer-created",
      "older-created",
    ]);
    expect(
      (await listPosts(db, PostListQuerySchema.parse({}), "ALL")).list.map(
        ({ id }) => id,
      ),
    ).toEqual(["older-created", "newer-created"]);
  });

  it("keeps admin list versions usable for CAS deletion and full details intact", async () => {
    await insertPost("507f1f77bcf86cd799439011", { version: 4 });
    await db.insert(schema.postTranslation).values([
      {
        postId: "507f1f77bcf86cd799439011",
        locale: MultiLangEnum.En,
        title: "Title",
        quoteContent: "Quote",
        content: "Body",
      },
      {
        postId: "507f1f77bcf86cd799439011",
        locale: MultiLangEnum.Zh,
        title: "标题",
        quoteContent: "引用",
        content: "正文",
      },
    ]);
    await db.insert(schema.categoryTranslation).values([
      {
        categoryId: "child",
        locale: MultiLangEnum.Zh,
        title: "分类",
        description: "not sent",
      },
      {
        categoryId: "child",
        locale: MultiLangEnum.En,
        title: "Category",
        description: "not sent",
      },
    ]);
    const result = await listPosts(db, {}, "ALL");
    const [post] = result.list;
    if (!post) throw new Error("Expected the versioned admin post");
    expect(Object.keys(post).sort()).toEqual(
      [
        "id",
        "version",
        "title",
        "quoteContent",
        "type",
        "status",
        "createdAt",
        "updatedAt",
        "views",
        "category",
        "author",
      ].sort(),
    );
    expect(post).toMatchObject({
      version: 4,
      title: { en: "Title", zh: "标题" },
      quoteContent: { en: "Quote", zh: "引用" },
      category: { title: { zh: "分类", en: "Category" } },
      author: { name: "Author" },
    });
    expect(await getPost(db, post.id, "ALL")).toMatchObject({
      content: { en: "Body", zh: "正文" },
      movieActors: [],
      coverId: null,
    });
    await destroyPosts(
      db,
      { items: [{ id: post.id, expectedVersion: post.version }] },
      "author",
      { invalidate: async () => ({ state: "completed" }) },
    );
    expect(await getPost(db, post.id, "ALL")).toBeNull();
  });

  it("measures narrow versus full relation serialization for 10 and 100 bilingual long bodies", async () => {
    const ids = Array.from(
      { length: 100 },
      (_, index) => `body-${String(index).padStart(3, "0")}`,
    );
    await db.insert(schema.post).values(
      ids.map((id) => ({
        id,
        authorId: "author",
        categoryId: "child",
        status: PostStatus.PUBLISHED,
      })),
    );
    for (const locale of [MultiLangEnum.En, MultiLangEnum.Zh]) {
      await db.insert(schema.postTranslation).values(
        ids.map((postId) => ({
          postId,
          locale,
          title: `Title ${postId}`,
          quoteContent: "Quote",
          content: "body ".repeat(1000),
        })),
      );
    }
    for (const limit of [10, 100]) {
      const start = performance.now();
      const narrow = await listPosts(
        db,
        { limit, sortField: "id", sortOrder: "asc" },
        "ALL",
      );
      const narrowListMs = performance.now() - start;
      const narrowStart = performance.now();
      await loadAdminPostListItems(db, narrow.list, "ALL");
      const narrowHydrationMs = performance.now() - narrowStart;
      const fullStart = performance.now();
      const full = await loadPostRelations(db, narrow.list, "ALL");
      const fullHydrationMs = performance.now() - fullStart;
      const narrowBytes = Buffer.byteLength(JSON.stringify(narrow.list));
      const fullBytes = Buffer.byteLength(JSON.stringify(full));
      expect(narrowBytes).toBeLessThan(fullBytes);
      expect(narrow.list.every((row) => !("content" in row))).toBe(true);
      process.stdout.write(
        `post-admin-list-measurement ${JSON.stringify({
          rows: limit,
          narrowBytes,
          fullBytes,
          narrowListMs,
          narrowHydrationMs,
          fullHydrationMs,
          scope:
            "synthetic local SQLite, single sample per projection; hydration timings exclude ID/count selection, not production latency",
        })}\n`,
      );
    }
  });
});
