import { incrementPostViews } from "@/features/post/server/post-commands";
import { incrementPageViews } from "@/features/page/server";
const invalidator = {
  invalidate: async () => ({ state: "completed" as const }),
};
import { listPosts } from "@/features/post/server/post-queries";
import { listPages } from "@/features/page/server/page-queries";
import { updateSetting, getSetting } from "@/features/setting/server";
import { createPost, updatePost } from "@/features/post/server/post-commands";
import { createPage, updatePage } from "@/features/page/server";
import { createTag, updateTag, listTags } from "@/features/tag/server";
import {
  createCategory,
  updateCategory,
  listCategories,
} from "@/features/category/server";
import { createClient, type Client } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCommentQueryRepository } from "@/features/comment/server/comment-query-repository";

import { PageTemplate } from "@/features/page/page-template";
import { PageStatus } from "@/features/page/page-status";
import { PostStatus } from "@/features/post/post-status";
import { randomUUID } from "node:crypto";
import { PostUpdateSchema } from "@/features/post/schema";
import { CommentStatus } from "@/features/comment/comment-status";
import * as schema from "@/lib/db/schema";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));

async function migrate(client: Client) {
  for (const file of readdirSync("drizzle")
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await client.executeMultiple(readFileSync(join("drizzle", file), "utf8"));
  }
}

describe("translation repository writes", () => {
  let directory: string;
  let client: Client;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeEach(async () => {
    directory = mkdtempSync(
      join(tmpdir(), `honeycomb-repository-${process.getuid?.() ?? "user"}-`),
    );
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    if (typeof process.getuid === "function")
      expect(stat.uid).toBe(process.getuid());
    client = createClient({ url: `file:${join(directory, "repository.db")}` });
    await client.execute("pragma foreign_keys = on");
    await migrate(client);
    db = drizzle(client, { schema });
    await client.execute(
      "insert into user (id, email, level, status) values ('author', 'author@example.com', 'ADMIN', 'ENABLE')",
    );
  });

  afterEach(() => {
    client.close();
    rmSync(directory, { recursive: true });
    expect(existsSync(directory)).toBe(false);
  });

  it("writes required entity translations without changing repository DTOs", async () => {
    const category = await createCategory(
      db,
      {
        id: "category",
        path: "category",
        title: { en: "Category", zh: "分类" },
        description: { en: "Description", zh: "描述" },
      },
      invalidator,
    );
    const tag = await createTag(
      db,
      {
        id: "tag",
        name: { en: "Tag", zh: "标签" },
      },
      invalidator,
    );
    const page = await createPage(
      db,
      {
        template: PageTemplate.DEFAULT,
        title: { en: "Page", zh: "页面" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
      invalidator,
    );

    expect(category.title).toEqual({ en: "Category", zh: "分类" });
    expect(tag.name).toEqual({ en: "Tag", zh: "标签" });
    expect(page).toMatchObject({ id: expect.any(String) });
    expect(
      (
        await client.execute(
          "select locale, title from category_translation order by locale",
        )
      ).rows,
    ).toEqual([
      { locale: "en", title: "Category" },
      { locale: "zh", title: "分类" },
    ]);
    expect(
      await client.execute(
        "select locale, name from tag_translation order by locale",
      ),
    ).toMatchObject({
      rows: [
        { locale: "en", name: "Tag" },
        { locale: "zh", name: "标签" },
      ],
    });
    expect(
      await client.execute("select count(*) as count from page_translation"),
    ).toMatchObject({
      rows: [{ count: 2 }],
    });
  });

  it("rolls back a parent create when translation persistence fails", async () => {
    await client.execute(`create trigger reject_category_translation
      before insert on category_translation begin
      select raise(abort, 'translation rejected'); end`);

    await expect(
      createCategory(
        db,
        {
          id: "rolled-back",
          path: "rolled-back",
          title: { en: "Category", zh: "分类" },
          description: { en: "Description", zh: "描述" },
        },
        invalidator,
      ),
    ).rejects.toThrow(/translation rejected/i);
    expect(
      await client.execute(
        "select count(*) as count from category where id = 'rolled-back'",
      ),
    ).toMatchObject({
      rows: [{ count: 0 }],
    });
  });

  it("preserves partial post languages and merges setting locale patches", async () => {
    await createCategory(
      db,
      {
        id: "category",
        path: "category",
        title: { en: "Category", zh: "分类" },
        description: { en: "Description", zh: "描述" },
      },
      invalidator,
    );
    const post = await createPost(
      db,
      {
        creationToken: randomUUID(),
        categoryId: "category",
        title: { zh: "文章" },
        excerpt: { en: "Excerpt" },
      },
      "author",
      invalidator,
    );
    await client.execute("insert into setting (id) values ('setting')");
    await client.execute(
      "insert into setting_translation (setting_id, locale, site_name, site_sub_name) values ('setting', 'en', 'Original', 'Subtitle'), ('setting', 'zh', '原始', '副标题')",
    );

    await updateSetting(
      db,
      { id: "setting", siteName: { zh: "新版" } },
      invalidator,
    );
    await updatePost(
      db,
      { id: post.id, expectedVersion: post.version, title: { zh: null } },
      "author",
      invalidator,
    );

    expect(
      await client.execute(
        "select locale, title, excerpt from post_translation order by locale",
      ),
    ).toMatchObject({
      rows: [{ locale: "en", title: null, excerpt: "Excerpt" }],
    });
    expect(await getSetting(db)).toMatchObject({
      siteName: { en: "Original", zh: "新版" },
      siteSubName: { en: "Subtitle", zh: "副标题" },
    });
    await updateSetting(db, { id: "setting", siteName: null }, invalidator);
    expect(await getSetting(db)).toMatchObject({
      siteName: null,
      siteSubName: { en: "Subtitle", zh: "副标题" },
    });
  });

  it("rolls back parent updates when a required translation update fails", async () => {
    const page = await createPage(
      db,
      {
        template: PageTemplate.DEFAULT,
        title: { en: "Page", zh: "页面" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
      invalidator,
    );
    await client.execute(`create trigger reject_page_translation_update
      before update on page_translation begin
      select raise(abort, 'translation update rejected'); end`);

    await expect(
      updatePage(
        db,
        {
          id: page.id,
          status: PageStatus.PUBLISHED,
          title: { en: "Published", zh: "已发布" },
        },
        invalidator,
      ),
    ).rejects.toThrow();
    expect(
      await client.execute({
        sql: "select status from page where id = ?",
        args: [page.id],
      }),
    ).toMatchObject({ rows: [{ status: PageStatus.TO_AUDIT }] });
  });

  it("restores missing required translation rows during complete updates", async () => {
    const category = await createCategory(
      db,
      {
        id: "category",
        path: "category",
        title: { en: "Category", zh: "分类" },
        description: { en: "Description", zh: "描述" },
      },
      invalidator,
    );
    const tag = await createTag(
      db,
      {
        id: "tag",
        name: { en: "Tag", zh: "标签" },
      },
      invalidator,
    );
    const page = await createPage(
      db,
      {
        template: PageTemplate.DEFAULT,
        title: { en: "Page", zh: "页面" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
      invalidator,
    );
    await client.execute(
      "delete from category_translation where category_id = 'category' and locale = 'en'",
    );
    await client.execute(
      "delete from tag_translation where tag_id = 'tag' and locale = 'en'",
    );
    await client.execute({
      sql: "delete from page_translation where page_id = ? and locale = 'en'",
      args: [page.id],
    });

    await updateCategory(
      db,
      {
        id: category.id,
        title: { en: "Updated category", zh: "更新分类" },
        description: { en: "Updated description", zh: "更新描述" },
      },
      invalidator,
    );
    await updateTag(
      db,
      {
        id: tag.id,
        name: { en: "Updated tag", zh: "更新标签" },
      },
      invalidator,
    );
    await updatePage(
      db,
      {
        id: page.id,
        title: { en: "Updated page", zh: "更新页面" },
        content: { en: "Updated content", zh: "更新正文" },
      },
      invalidator,
    );

    expect(
      await client.execute(
        "select locale, title from category_translation order by locale",
      ),
    ).toMatchObject({
      rows: [
        { locale: "en", title: "Updated category" },
        { locale: "zh", title: "更新分类" },
      ],
    });
    expect(
      await client.execute(
        "select locale, name from tag_translation order by locale",
      ),
    ).toMatchObject({
      rows: [
        { locale: "en", name: "Updated tag" },
        { locale: "zh", name: "更新标签" },
      ],
    });
    expect(
      await client.execute({
        sql: "select locale, title from page_translation where page_id = ? order by locale",
        args: [page.id],
      }),
    ).toMatchObject({
      rows: [
        { locale: "en", title: "Updated page" },
        { locale: "zh", title: "更新页面" },
      ],
    });
  });

  describe.each(["post", "page"] as const)("%s content timestamps", (type) => {
    const previousTime = "2020-01-02T03:04:05.000Z";
    const nextTime = "2026-10-15T12:00:00.000Z";

    beforeEach(async () => {
      await client.execute(
        "insert into category (id, path) values ('timestamp-category', 'timestamp-category')",
      );
      if (type === "post") {
        await client.execute({
          sql: "insert into post (id, author_id, category_id, status, updated_at) values ('timestamp-content', 'author', 'timestamp-category', ?, ?)",
          args: [PostStatus.PUBLISHED, previousTime],
        });
        await client.execute(
          "insert into post_translation (post_id, locale, title) values ('timestamp-content', 'en', 'Original')",
        );
      } else {
        await client.execute({
          sql: "insert into page (id, author_id, template, status, updated_at) values ('timestamp-content', 'author', ?, ?, ?)",
          args: [PageTemplate.DEFAULT, PageStatus.PUBLISHED, previousTime],
        });
        await client.execute(
          "insert into page_translation (page_id, locale, title, content) values ('timestamp-content', 'en', 'Original', 'Body'), ('timestamp-content', 'zh', '原始', '正文')",
        );
      }
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(nextTime));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function operations() {
      return {
        update: (
          input: Pick<Parameters<typeof updatePage>[1], "id" | "title">,
        ) =>
          type === "post"
            ? updatePost(
                db,
                { ...input, expectedVersion: 0 },
                "author",
                invalidator,
              )
            : updatePage(db, input, invalidator),
        incrementViews: (id: string) =>
          type === "post"
            ? incrementPostViews(db, id)
            : incrementPageViews(db, id),
      };
    }

    it("advances the parent timestamp for a translation-only update", async () => {
      const updated = await operations().update({
        id: "timestamp-content",
        title: { en: "Updated", zh: "更新" },
      });

      if (type === "page")
        expect(updated).toMatchObject({ updatedAt: nextTime });
      else expect(updated).toMatchObject({ version: 1 });
      expect(
        await client.execute(
          `select updated_at from ${type} where id = 'timestamp-content'`,
        ),
      ).toMatchObject({
        rows: [{ updated_at: nextTime }],
      });
      expect(
        await client.execute(
          `select title from ${type}_translation where ${type}_id = 'timestamp-content' and locale = 'en'`,
        ),
      ).toMatchObject({
        rows: [{ title: "Updated" }],
      });
    });

    it("rolls back timestamps and translations together when translation persistence fails", async () => {
      await client.execute(`create trigger reject_timestamp_translation
        before ${type === "post" ? "insert" : "update"} on ${type}_translation begin
        select raise(abort, 'translation rejected'); end`);

      await expect(
        operations().update({
          id: "timestamp-content",
          title: { en: "Rejected", zh: "拒绝" },
        }),
      ).rejects.toThrow();

      expect(
        await client.execute(
          `select updated_at from ${type} where id = 'timestamp-content'`,
        ),
      ).toMatchObject({
        rows: [{ updated_at: previousTime }],
      });
      expect(
        await client.execute(
          `select title from ${type}_translation where ${type}_id = 'timestamp-content' and locale = 'en'`,
        ),
      ).toMatchObject({
        rows: [{ title: "Original" }],
      });
    });

    it.each([previousTime, null])(
      "preserves content updatedAt %s when counting views",
      async (updatedAt) => {
        await client.execute({
          sql: `update ${type} set updated_at = ? where id = 'timestamp-content'`,
          args: [updatedAt],
        });

        await expect(
          operations().incrementViews("timestamp-content"),
        ).resolves.toEqual({ views: 1 });
        expect(
          await client.execute(
            `select views, updated_at from ${type} where id = 'timestamp-content'`,
          ),
        ).toMatchObject({
          rows: [{ views: 1, updated_at: updatedAt }],
        });
      },
    );

    it("leaves the timestamp unchanged for an empty patch", async () => {
      if (type === "post") {
        expect(
          PostUpdateSchema.safeParse({ id: "a".repeat(24), expectedVersion: 0 })
            .success,
        ).toBe(false);
      } else {
        const unchanged = await operations().update({
          id: "timestamp-content",
        });
        expect(unchanged).toMatchObject({ updatedAt: previousTime });
      }
      expect(
        await client.execute(
          `select updated_at from ${type} where id = 'timestamp-content'`,
        ),
      ).toMatchObject({ rows: [{ updated_at: previousTime }] });
    });
  });

  it("assembles translated titles for every admin comment relation", async () => {
    await createCategory(
      db,
      {
        id: "category",
        path: "category",
        title: { en: "Category", zh: "分类" },
        description: { en: "Description", zh: "描述" },
      },
      invalidator,
    );
    const page = await createPage(
      db,
      {
        template: PageTemplate.DEFAULT,
        title: { en: "Page", zh: "页面" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
      invalidator,
    );
    const post = await createPost(
      db,
      {
        creationToken: randomUUID(),
        categoryId: "category",
        title: { en: "Post", zh: "文章" },
      },
      "author",
      invalidator,
    );
    await db.insert(schema.comment).values([
      {
        id: "comment-post",
        author: "Author",
        content: "Post comment",
        email: "post@example.com",
        postId: post.id,
        status: CommentStatus.PUBLISH,
      },
      {
        id: "comment-page",
        author: "Author",
        content: "Page comment",
        email: "page@example.com",
        pageId: page.id,
        status: CommentStatus.PUBLISH,
      },
      {
        id: "comment-custom",
        author: "Author",
        content: "Custom comment",
        email: "custom@example.com",
        customId: post.id,
        status: CommentStatus.PUBLISH,
      },
    ]);

    const result = await createCommentQueryRepository(db).list({
      page: 1,
      limit: 10,
    });
    const comments = Object.fromEntries(
      result.list.map((comment) => [comment.id, comment]),
    );

    expect(comments["comment-post"]?.post?.title).toEqual({
      en: "Post",
      zh: "文章",
    });
    expect(comments["comment-page"]?.page?.title).toEqual({
      en: "Page",
      zh: "页面",
    });
    expect(comments["comment-custom"]?.custom?.title).toEqual({
      en: "Post",
      zh: "文章",
    });
  });

  it("assembles stable read models and counts multilingual matches once", async () => {
    await createCategory(
      db,
      {
        id: "category",
        path: "category",
        title: { en: "Shared category", zh: "Shared category" },
        description: { en: "Description", zh: "描述" },
      },
      invalidator,
    );
    await createTag(
      db,
      {
        id: "tag",
        name: { en: "Tag", zh: "标签" },
      },
      invalidator,
    );
    await createPage(
      db,
      {
        template: PageTemplate.DEFAULT,
        title: { en: "Page", zh: "页面" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
      invalidator,
    );
    const post = await createPost(
      db,
      {
        creationToken: randomUUID(),
        categoryId: "category",
        title: { en: "Post", zh: "文章" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
      invalidator,
    );
    await updatePost(
      db,
      {
        id: post.id,
        expectedVersion: post.version,
        movieActorIds: ["tag"],
      },
      "author",
      invalidator,
    );

    await expect(
      listCategories(db, { title: "Shared" }, "ALL"),
    ).resolves.toMatchObject({
      total: 1,
      list: [{ title: { en: "Shared category", zh: "Shared category" } }],
    });
    await expect(listTags(db, { name: "标签" })).resolves.toMatchObject({
      total: 1,
      list: [{ name: { en: "Tag", zh: "标签" } }],
    });
    await expect(
      listPages(db, { title: "页面" }, "ALL"),
    ).resolves.toMatchObject({
      total: 1,
      list: [
        {
          title: { en: "Page", zh: "页面" },
          content: { en: "Content", zh: "正文" },
        },
      ],
    });
    await expect(
      listPosts(db, { title: "文章" }, "ALL"),
    ).resolves.toMatchObject({
      total: 1,
      list: [
        {
          title: { en: "Post", zh: "文章" },
          content: { en: "Content", zh: "正文" },
          category: { title: { en: "Shared category", zh: "Shared category" } },
          movieActors: [{ name: { en: "Tag", zh: "标签" } }],
        },
      ],
    });
  });
});
