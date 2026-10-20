// @vitest-environment node
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createClient,
  type InArgs,
  type InStatement,
} from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commentRouter } from "@/features/comment/router";
import { pageRouter } from "@/features/page/router";
import { postRouter } from "@/features/post/router";
import { UserLevel } from "@/features/user/user";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import { PostStatus } from "@/features/post/post-status";
import { PostType } from "@/features/post/post-type";
import { PageStatus } from "@/features/page/page-status";
import { PageTemplate } from "@/features/page/page-template";
import type { Context } from "@/lib/trpc/context";
import * as schema from "@/lib/db/schema";
import { configureObservability } from "@/lib/observability/server/registry";
import { createMemoryObservability } from "./helpers/memory-observability";

const id = (name: string) => name.padEnd(24, "0");
const statuses = [PostStatus.PUBLISHED, PostStatus.DRAFT, PostStatus.TO_AUDIT];
const privateCommentFields = [
  "email",
  "ip",
  "userAgent",
  "parentId",
  "postId",
  "pageId",
  "customId",
];

describe("admin read boundaries with real role permissions and SQLite", () => {
  let directory: string;
  let client: ReturnType<typeof createClient>;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  function context(level: UserLevel | null): Context {
    return {
      db,
      user: level ? { id: id("reader"), level } : null,
      header: new Headers(),
      hasRequest: false,
      requestId: "guest-read-test",
      requestObservabilityEnabled: false,
    };
  }

  function beforePayloadRead(
    table: "post" | "page",
    change: () => Promise<void>,
  ) {
    const execute = client.execute.bind(client);
    let changed = false;
    vi.spyOn(client, "execute").mockImplementation(
      async (statement: InStatement, args?: InArgs) => {
        const sql = typeof statement === "string" ? statement : statement.sql;
        if (!changed && sql.includes(`from "${table}" "${table}"`)) {
          changed = true;
          await change();
        }
        return typeof statement === "string"
          ? execute(statement, args)
          : execute(statement);
      },
    );
  }

  async function withdrawPost() {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.post)
        .set({ status: PostStatus.DRAFT })
        .where(eq(schema.post.id, id("post-PUBLISHED")));
      await tx
        .update(schema.postTranslation)
        .set({ title: "Private draft", content: "Private draft content" })
        .where(eq(schema.postTranslation.postId, id("post-PUBLISHED")));
    });
  }

  async function withdrawPage() {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.page)
        .set({ status: PageStatus.DRAFT })
        .where(eq(schema.page.id, id("page-PUBLISHED")));
      await tx
        .update(schema.pageTranslation)
        .set({ title: "Private page", content: "Private page content" })
        .where(eq(schema.pageTranslation.pageId, id("page-PUBLISHED")));
    });
  }

  beforeEach(async () => {
    configureObservability(createMemoryObservability());
    directory = mkdtempSync(join(tmpdir(), "honeycomb-guest-read-"));
    client = createClient({ url: `file:${join(directory, "test.db")}` });
    db = drizzle(client, { schema });
    for (const file of readdirSync("drizzle")
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      await client.executeMultiple(readFileSync(`drizzle/${file}`, "utf8"));
    }
    await db.insert(schema.user).values({
      id: id("author"),
      name: "Author",
      email: "author@example.test",
    });
    await db
      .insert(schema.category)
      .values({ id: id("category"), path: "category" });
    await db.insert(schema.categoryTranslation).values(
      [MultiLangEnum.En, MultiLangEnum.Zh].map((locale) => ({
        categoryId: id("category"),
        locale,
        title: "Category",
        description: "Category",
      })),
    );
    for (const status of statuses) {
      const postId = id(`post-${status}`);
      const pageId = id(`page-${status}`);
      await db.insert(schema.post).values({
        id: postId,
        authorId: id("author"),
        categoryId: id("category"),
        status,
      });
      await db
        .insert(schema.page)
        .values({ id: pageId, authorId: id("author"), status });
      for (const locale of [MultiLangEnum.En, MultiLangEnum.Zh]) {
        await db.insert(schema.postTranslation).values({
          postId,
          locale,
          title: `post-${status}`,
          content: `post-content-${status}`,
        });
        await db.insert(schema.pageTranslation).values({
          pageId,
          locale,
          title: `page-${status}`,
          content: `page-content-${status}`,
        });
      }
      for (const [kind, target] of [
        ["post", { postId }],
        ["page", { pageId }],
        ["custom", { customId: postId }],
      ] as const) {
        await db.insert(schema.comment).values({
          id: id(`${kind}-${status}`),
          author: "Visitor",
          content: `${kind}-comment-${status}`,
          email: "private@example.test",
          ip: "203.0.113.42",
          userAgent: "Private Browser",
          site: "https://example.test",
          ...target,
        });
      }
    }
    await db.insert(schema.comment).values({
      id: id("orphan-custom"),
      customId: id("missing-post"),
      author: "Visitor",
      content: "orphan comment",
      email: "orphan@example.test",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    client.close();
    rmSync(directory, { recursive: true, force: true });
    configureObservability();
  });

  it("keeps guest admin lists available but returns only published rows and counts", async () => {
    const posts = await postRouter
      .createCaller(context(UserLevel.GUEST))
      .adminIndex({ limit: 1 });
    const pages = await pageRouter
      .createCaller(context(UserLevel.GUEST))
      .adminIndex({ limit: 1 });
    expect(posts.list.map((post) => post.id)).toEqual([id("post-PUBLISHED")]);
    expect(posts.total).toBe(1);
    expect(pages.list.map((page) => page.id)).toEqual([id("page-PUBLISHED")]);
    expect(pages.total).toBe(1);
  });

  it.each([PostStatus.DRAFT, PostStatus.TO_AUDIT])(
    "does not let guest status/search filters recover %s rows or counts",
    async (status) => {
      const posts = postRouter.createCaller(context(UserLevel.GUEST));
      const pages = pageRouter.createCaller(context(UserLevel.GUEST));
      expect(await posts.adminIndex({ status: [status] })).toEqual({
        list: [],
        total: 0,
      });
      expect(await pages.adminIndex({ status: [status] })).toEqual({
        list: [],
        total: 0,
      });
      expect(
        await posts.adminIndex({
          title: `post-${status}`,
          content: `post-content-${status}`,
        }),
      ).toEqual({ list: [], total: 0 });
      expect(
        await pages.adminIndex({
          title: `page-${status}`,
          content: `page-content-${status}`,
        }),
      ).toEqual({ list: [], total: 0 });
    },
  );

  it.each([PostStatus.DRAFT, PostStatus.TO_AUDIT])(
    "does not return %s detail to a guest who knows its ID",
    async (status) => {
      await expect(
        postRouter
          .createCaller(context(UserLevel.GUEST))
          .adminDetail({ id: id(`post-${status}`) }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(
        await pageRouter
          .createCaller(context(UserLevel.GUEST))
          .adminDetail({ id: id(`page-${status}`) }),
      ).toBeNull();
    },
  );

  it("keeps published admin detail readable by guests", async () => {
    expect(
      await postRouter
        .createCaller(context(UserLevel.GUEST))
        .adminDetail({ id: id("post-PUBLISHED") }),
    ).toMatchObject({
      status: PostStatus.PUBLISHED,
      content: { en: "post-content-PUBLISHED" },
    });
    expect(
      await pageRouter
        .createCaller(context(UserLevel.GUEST))
        .adminDetail({ id: id("page-PUBLISHED") }),
    ).toMatchObject({
      status: PageStatus.PUBLISHED,
      content: { en: "page-content-PUBLISHED" },
    });
  });

  it.each(["list", "detail"] as const)(
    "hides a post withdrawn before its %s payload is read",
    async (read) => {
      beforePayloadRead("post", withdrawPost);
      const caller = postRouter.createCaller(context(UserLevel.GUEST));
      if (read === "detail") {
        await expect(
          caller.adminDetail({ id: id("post-PUBLISHED") }),
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
      } else {
        const result = await caller.adminIndex({});
        expect(result.list).toEqual([]);
        expect(JSON.stringify(result)).not.toContain("Private draft");
      }
    },
  );

  it("hides a page withdrawn before its list payload is read", async () => {
    beforePayloadRead("page", withdrawPage);
    const result = await pageRouter
      .createCaller(context(UserLevel.GUEST))
      .adminIndex({});
    expect(result.list).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("Private page");
  });

  it.each([UserLevel.ADMIN, UserLevel.EDITOR])(
    "preserves %s reads when a target becomes a draft during hydration",
    async (level) => {
      beforePayloadRead("post", withdrawPost);
      const post = await postRouter
        .createCaller(context(level))
        .adminDetail({ id: id("post-PUBLISHED") });
      expect(post.content).toMatchObject({ en: "Private draft content" });
      vi.restoreAllMocks();
      beforePayloadRead("page", withdrawPage);
      const pages = await pageRouter
        .createCaller(context(level))
        .adminIndex({});
      expect(
        pages.list.find((page) => page.id === id("page-PUBLISHED"))?.content,
      ).toMatchObject({ en: "Private page content" });
    },
  );

  it("uses the current published post payload without exposing raw joined rows", async () => {
    beforePayloadRead("post", async () => {
      await db
        .update(schema.post)
        .set({ type: PostType.MOVIE, movieTime: "2026" })
        .where(eq(schema.post.id, id("post-PUBLISHED")));
    });
    const result = await postRouter
      .createCaller(context(UserLevel.GUEST))
      .adminDetail({ id: id("post-PUBLISHED") });
    expect(result).toMatchObject({ type: PostType.MOVIE, movieTime: "2026" });
    expect(result).not.toHaveProperty("translations");
    expect(result).not.toHaveProperty("postTags");
    expect(result.author).not.toHaveProperty("email");
  });

  it("uses the current published page metadata with its payload", async () => {
    beforePayloadRead("page", async () => {
      await db
        .update(schema.page)
        .set({ template: PageTemplate.FRIENDLY_LINKS })
        .where(eq(schema.page.id, id("page-PUBLISHED")));
    });
    const result = await pageRouter
      .createCaller(context(UserLevel.GUEST))
      .adminIndex({});
    expect(result.list[0]).toMatchObject({
      template: PageTemplate.FRIENDLY_LINKS,
    });
    expect(result.list[0]).not.toHaveProperty("translations");
  });

  it("omits guest comment private fields and hides comments on unpublished or missing targets", async () => {
    const result = await commentRouter
      .createCaller(context(UserLevel.GUEST))
      .index({ limit: 20 });
    expect(result.total).toBe(3);
    expect(result.list.map((comment) => comment.id).sort()).toEqual(
      ["post", "page", "custom"].map((kind) => id(`${kind}-PUBLISHED`)).sort(),
    );
    for (const comment of result.list) {
      for (const field of privateCommentFields)
        expect(comment).not.toHaveProperty(field);
      expect(comment).toMatchObject({
        author: "Visitor",
        site: "https://example.test",
      });
    }
    expect(JSON.stringify(result)).not.toMatch(
      /private@example|203\.0\.113|Private Browser|DRAFT|TO_AUDIT|missing-post/,
    );
    expect(
      result.list.find((comment) => comment.id === id("custom-PUBLISHED"))
        ?.custom?.title,
    ).toEqual({ en: "post-PUBLISHED", zh: "post-PUBLISHED" });
  });

  it("applies guest comment target visibility before pagination, searching, and counting", async () => {
    const caller = commentRouter.createCaller(context(UserLevel.GUEST));
    const secondPage = await caller.index({ limit: 2, page: 2 });
    expect(secondPage.total).toBe(3);
    expect(secondPage.list).toHaveLength(1);
    expect(await caller.index({ content: "DRAFT" })).toEqual({
      list: [],
      total: 0,
    });
    expect(await caller.index({ content: "TO_AUDIT" })).toEqual({
      list: [],
      total: 0,
    });
  });

  it.each([
    { email: "private" },
    { ip: "203.0.113" },
    ...privateCommentFields.map((sortField) => ({ sortField })),
  ])("rejects guest private comment search/sort oracle %j", async (input) => {
    await expect(
      commentRouter.createCaller(context(UserLevel.GUEST)).index(input),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.each([UserLevel.ADMIN, UserLevel.EDITOR])(
    "preserves %s access to unpublished content and comment private fields",
    async (level) => {
      const posts = postRouter.createCaller(context(level));
      const pages = pageRouter.createCaller(context(level));
      expect((await posts.adminIndex({})).total).toBe(3);
      expect((await pages.adminIndex({})).total).toBe(3);
      for (const status of statuses) {
        expect(
          await posts.adminDetail({ id: id(`post-${status}`) }),
        ).toMatchObject({ status, content: { en: `post-content-${status}` } });
        expect(
          await pages.adminDetail({ id: id(`page-${status}`) }),
        ).toMatchObject({ status, content: { en: `page-content-${status}` } });
      }
      const comments = await commentRouter.createCaller(context(level)).index({
        email: "private",
        ip: "203.0.113",
        sortField: "email",
        limit: 20,
      });
      expect(comments.total).toBe(9);
      expect(comments.list[0]).toMatchObject({
        email: "private@example.test",
        ip: "203.0.113.42",
        userAgent: "Private Browser",
      });
      for (const field of privateCommentFields)
        expect(comments.list[0]).toHaveProperty(field);
      expect(
        comments.list.find((comment) => comment.id === id("custom-DRAFT"))
          ?.custom?.title,
      ).toMatchObject({ en: "post-DRAFT" });
    },
  );

  it("continues to reject anonymous admin reads", async () => {
    await expect(
      postRouter.createCaller(context(null)).adminIndex({}),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      postRouter
        .createCaller(context(null))
        .adminDetail({ id: id("post-PUBLISHED") }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      pageRouter.createCaller(context(null)).adminIndex({}),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      pageRouter
        .createCaller(context(null))
        .adminDetail({ id: id("page-PUBLISHED") }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      commentRouter.createCaller(context(null)).index({}),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
