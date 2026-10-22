// @vitest-environment node
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
import { updateCategory } from "@/features/category/server/category-commands";
import { createCommentQueryRepository } from "@/features/comment/server/comment-query-repository";
import { createCommentNotificationRepository } from "@/features/comment/server/comment-notification-repository";
import { listMenus } from "@/features/menu/server/menu-queries";
import { listTags } from "@/features/tag/server/tag-queries";
import { updateTag } from "@/features/tag/server/tag-commands";
import { listPublicPosts } from "@/features/post/server/post-queries";
import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";
import { PageStatus } from "@/features/page/types/page.status";
import { MenuType } from "@/features/menu/types/menu.type";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import * as schema from "@/lib/db/schema";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
  getLogger: () => ({ error: vi.fn() }),
}));

const previousTime = "2020-01-02T03:04:05.000Z";
const nextTime = "2026-10-15T12:00:00.000Z";
const invalidator = {
  invalidate: async () => ({ state: "completed" as const }),
};

describe("reconciled data boundaries", () => {
  let directory: string | undefined;
  let client: Client | undefined;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let queries: string[];

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-data-boundaries-"));
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    if (typeof process.getuid === "function")
      expect(stat.uid).toBe(process.getuid());
    const localClient = createClient({
      url: `file:${join(directory, "repository.db")}`,
    });
    client = localClient;
    await localClient.execute("pragma foreign_keys = on");
    for (const file of readdirSync("drizzle")
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await localClient.executeMultiple(
        readFileSync(join("drizzle", file), "utf8"),
      );
    }
    queries = [];
    db = drizzle(localClient, {
      schema,
      logger: { logQuery: (query) => queries.push(query) },
    });
    await db
      .insert(schema.user)
      .values({ id: "author", email: "author@example.com" });
  });

  afterEach(() => {
    vi.useRealTimers();
    client?.close();
    client = undefined;
    if (directory) {
      rmSync(directory, { recursive: true, force: true });
      expect(existsSync(directory)).toBe(false);
      directory = undefined;
    }
  });

  async function execute(sql: string) {
    if (!client) throw new Error("Local test database is not initialized");
    return client.execute(sql);
  }

  describe("exact tag ID filters", () => {
    beforeEach(async () => {
      await db
        .insert(schema.tag)
        .values([
          { id: "tag-a" },
          { id: "tag-b" },
          { id: "prefix-tag-a-suffix" },
        ]);
    });

    it("matches every requested ID without substring matches", async () => {
      const result = await listTags(db, {
        id: ["tag-a", "tag-b"],
        sortField: "id",
        sortOrder: "asc",
      });
      expect(result.list.map(({ id }) => id)).toEqual(["tag-a", "tag-b"]);
      expect(result.total).toBe(2);
    });

    it("matches a single ID exactly", async () => {
      const result = await listTags(db, { id: ["tag-a"] });
      expect(result.list.map(({ id }) => id)).toEqual(["tag-a"]);
      expect(result.total).toBe(1);
    });

    it("preserves the existing unfiltered meaning of an empty ID array", async () => {
      expect((await listTags(db, { id: [] })).total).toBe(3);
    });
  });

  describe.each(["tag", "category"] as const)(
    "%s translated edit timestamps",
    (feature) => {
      const field = feature === "tag" ? "name" : "title";

      beforeEach(async () => {
        await execute(
          `insert into ${feature} (id, updated_at${feature === "category" ? ", path" : ""}) values ('timestamp', '${previousTime}'${feature === "category" ? ", 'timestamp'" : ""})`,
        );
        if (feature === "category") {
          await execute(
            "insert into category_translation (category_id, locale, title, description) values ('timestamp', 'en', 'Original', 'Description'), ('timestamp', 'zh', '原始', '描述')",
          );
        } else {
          await execute(
            `insert into ${feature}_translation (${feature}_id, locale, ${field}) values ('timestamp', 'en', 'Original'), ('timestamp', 'zh', '原始')`,
          );
        }
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(nextTime));
      });

      function updateTranslation() {
        return feature === "tag"
          ? updateTag(
              db,
              { id: "timestamp", name: { en: "Updated", zh: "更新" } },
              invalidator,
            )
          : updateCategory(
              db,
              { id: "timestamp", title: { en: "Updated", zh: "更新" } },
              invalidator,
            );
      }

      it("advances the parent timestamp for a translation-only update", async () => {
        expect(await updateTranslation()).toMatchObject({
          updatedAt: nextTime,
        });
        expect(
          await execute(
            `select updated_at from ${feature} where id = 'timestamp'`,
          ),
        ).toMatchObject({ rows: [{ updated_at: nextTime }] });
        expect(
          await execute(
            `select ${field} as value from ${feature}_translation where ${feature}_id = 'timestamp' and locale = 'en'`,
          ),
        ).toMatchObject({ rows: [{ value: "Updated" }] });
      });

      it("rolls back the timestamp with a rejected translation write", async () => {
        await execute(
          `create trigger reject_translation before ${feature === "category" ? "update" : "insert"} on ${feature}_translation begin select raise(abort, 'translation rejected'); end`,
        );
        await expect(updateTranslation()).rejects.toThrow();
        expect(
          await execute(
            `select updated_at from ${feature} where id = 'timestamp'`,
          ),
        ).toMatchObject({ rows: [{ updated_at: previousTime }] });
        expect(
          await execute(
            `select ${field} as value from ${feature}_translation where ${feature}_id = 'timestamp' and locale = 'en'`,
          ),
        ).toMatchObject({ rows: [{ value: "Original" }] });
      });

      it("leaves the parent timestamp unchanged for an empty patch", async () => {
        const result =
          feature === "tag"
            ? await updateTag(db, { id: "timestamp" }, invalidator)
            : await updateCategory(db, { id: "timestamp" }, invalidator);
        expect(result).toMatchObject({ updatedAt: previousTime });
      });
    },
  );

  describe("label-only read projections", () => {
    beforeEach(async () => {
      await db
        .insert(schema.category)
        .values({ id: "category", path: "category" });
      await db.insert(schema.page).values({
        id: "page",
        authorId: "author",
        status: PageStatus.PUBLISHED,
      });
      await db.insert(schema.post).values({
        id: "post",
        authorId: "author",
        categoryId: "category",
        status: PostStatus.PUBLISHED,
        type: PostType.QUOTE,
      });
      for (const locale of [MultiLangEnum.En, MultiLangEnum.Zh]) {
        await db.insert(schema.categoryTranslation).values({
          categoryId: "category",
          locale,
          title: `Category ${locale}`,
          description: "Unused category description",
        });
        await db.insert(schema.pageTranslation).values({
          pageId: "page",
          locale,
          title: `Page ${locale}`,
          content: "Unused page body".repeat(100),
        });
        await db.insert(schema.postTranslation).values({
          postId: "post",
          locale,
          title: locale === MultiLangEnum.En ? null : "文章",
          quoteContent: `Quote ${locale}`,
          quoteAuthor: `Author ${locale}`,
          content: "Unused post body".repeat(100),
          excerpt: "Unused excerpt",
        });
      }
      await db.insert(schema.comment).values([
        {
          id: "comment-post",
          author: "Comment author",
          content: "Post comment",
          email: "post@example.com",
          postId: "post",
        },
        {
          id: "comment-page",
          author: "Comment author",
          content: "Page comment",
          email: "page@example.com",
          pageId: "page",
        },
        {
          id: "comment-custom",
          author: "Comment author",
          content: "Custom comment",
          email: "custom@example.com",
          customId: "post",
        },
      ]);
    });

    function expectNoUnusedTranslationColumns(commentContentColumns = 0) {
      // SQLite's relational JSON projections use unqualified column names.
      // The comment's own content remains necessary; linked bodies do not.
      const sql = queries.join("\n");
      expect(sql.match(/"content"/g) ?? []).toHaveLength(commentContentColumns);
      expect(sql).not.toMatch(
        /"(?:description|excerpt|quote_author|gallery_location)"/,
      );
      expect(queries.length).toBeGreaterThan(0);
    }

    it("reads public QUOTE cards without bodies and retains every available locale", async () => {
      queries.length = 0;
      const result = await listPublicPosts(db, {});
      expect(result).toEqual({
        total: 1,
        list: [
          {
            id: "post",
            type: PostType.QUOTE,
            title: { zh: "文章" },
            excerpt: { en: "Unused excerpt", zh: "Unused excerpt" },
            movieTime: null,
            quoteContent: { en: "Quote en", zh: "Quote zh" },
            quoteAuthor: { en: "Author en", zh: "Author zh" },
            updatedAt: expect.any(String),
            cover: undefined,
          },
        ],
      });
      expect(queries.join("\n")).not.toMatch(
        /"(?:content|description|gallery_location)"/,
      );
    });

    it("loads menu titles without page bodies or category descriptions", async () => {
      await db.insert(schema.menu).values([
        {
          id: "menu-category",
          categoryId: "category",
          type: MenuType.CATEGORY,
          power: 0,
        },
        { id: "menu-page", pageId: "page", type: MenuType.PAGE, power: 1 },
      ]);
      queries.length = 0;
      const result = await listMenus(db, "PUBLIC_ONLY");
      expect(result.list.map(({ title }) => title)).toEqual([
        { en: "Category en", zh: "Category zh" },
        { en: "Page en", zh: "Page zh" },
      ]);
      expectNoUnusedTranslationColumns();
    });

    it("loads every comment target title without hydrating linked bodies", async () => {
      queries.length = 0;
      const result = await createCommentQueryRepository(db).list({});
      const comments = new Map(
        result.list.map((comment) => [comment.id, comment]),
      );
      expect(comments.get("comment-post")).toMatchObject({
        content: "Post comment",
        post: { title: { zh: "文章" } },
      });
      expect(comments.get("comment-page")).toMatchObject({
        page: { title: { en: "Page en", zh: "Page zh" } },
      });
      expect(comments.get("comment-custom")).toMatchObject({
        custom: { title: { zh: "文章" } },
      });
      expectNoUnusedTranslationColumns(1);
    });

    it.each(["post", "page"] as const)(
      "loads the %s notification title without its body",
      async (target) => {
        queries.length = 0;
        const result = await createCommentNotificationRepository(db).getComment(
          `comment-${target}`,
        );
        expect(result?.[target]?.title).toEqual(
          target === "post" ? { zh: "文章" } : { en: "Page en", zh: "Page zh" },
        );
        expectNoUnusedTranslationColumns(1);
      },
    );
  });
});
