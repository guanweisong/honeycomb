// @vitest-environment node
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";
import { MultiLangEnum } from "@/packages/domain/localization/i18n";
import { createAdminUser, createMockContext } from "@tests/helpers/test-utils";
import { postRouter } from "../post.router";

describe("public post search with real libSQL", () => {
  let directory: string;
  let client: ReturnType<typeof createClient>;
  let db: Database;
  const caller = (admin = false) =>
    postRouter.createCaller({
      ...createMockContext(admin ? createAdminUser("author") : null),
      db,
      requestObservabilityEnabled: false,
    });

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-post-search-"));
    client = createClient({ url: `file:${join(directory, "test.db")}` });
    for (const file of readdirSync("drizzle")
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      await client.executeMultiple(readFileSync(join("drizzle", file), "utf8"));
    }
    db = drizzle(client, { schema });
    await db
      .insert(schema.user)
      .values({ id: "author", name: "Author", email: "author@example.test" });
    await db
      .insert(schema.category)
      .values({ id: "category", path: "category" });
  });

  afterEach(() => {
    client.close();
    rmSync(directory, { recursive: true });
  });

  async function seed(
    id: string,
    title: string | null,
    content: string | null = null,
    status = PostStatus.PUBLISHED,
    locale = MultiLangEnum.En,
  ) {
    await db.insert(schema.post).values({
      id,
      authorId: "author",
      categoryId: "category",
      status,
      type: PostType.ARTICLE,
      createdAt: "2026-01-01T00:00:00Z",
    });
    await db
      .insert(schema.postTranslation)
      .values({ postId: id, locale, title, content });
  }

  it("matches title OR body in the current locale, never another translation", async () => {
    await seed("title", "Needle title");
    await seed("body", "Other", "<p>needle body</p>");
    await seed(
      "chinese",
      "中文 needle",
      null,
      PostStatus.PUBLISHED,
      MultiLangEnum.Zh,
    );
    await seed("translated", "No match", "Other body");
    await db.insert(schema.postTranslation).values({
      postId: "translated",
      locale: MultiLangEnum.Zh,
      title: "needle 中文",
    });
    expect(
      (await caller().search({ query: "  needle  ", locale: "en" })).map(
        (row) => row.id,
      ),
    ).toEqual(["body", "title"]);
    expect(
      (await caller().search({ query: "中文", locale: "zh" })).map(
        (row) => row.id,
      ),
    ).toEqual(["chinese", "translated"]);
  });

  it.each([false, true])(
    "excludes drafts and pending review for admin=%s",
    async (admin) => {
      await seed("published", "needle");
      await seed("draft", "needle", null, PostStatus.DRAFT);
      await seed("pending", "needle", null, PostStatus.TO_AUDIT);
      expect(
        (await caller(admin).search({ query: "needle", locale: "en" })).map(
          (row) => row.id,
        ),
      ).toEqual(["published"]);
    },
  );

  it.each(["%", "_", "\\", "' OR 1=1 --"])(
    "treats %s as literal text",
    async (query) => {
      await seed("literal", `A ${query} title`);
      await seed("other", "Ordinary title");
      expect(
        (await caller().search({ query, locale: "en" })).map((row) => row.id),
      ).toEqual(["literal"]);
    },
  );

  it("returns only public fields with decoded plain-text, bounded excerpts", async () => {
    await seed(
      "safe",
      "needle",
      "<p>Hello &amp; <b>world</b></p><script>secret()</script><style>.private{}</style><p>Next line</p>",
    );
    await seed("long", "needle", `<p>${"a".repeat(200)}</p>`);
    await seed("empty", "needle");
    const result = await caller().search({ query: "needle", locale: "en" });
    expect(result.find((row) => row.id === "safe")).toEqual({
      id: "safe",
      title: "needle",
      excerpt: "Hello & world Next line",
      type: PostType.ARTICLE,
      cover: null,
    });
    expect(result.find((row) => row.id === "empty")?.excerpt).toBe("");
    expect(result.find((row) => row.id === "long")?.excerpt).toBe(
      `${"a".repeat(159)}…`,
    );
  });

  it("returns only the public cover URL, preserving posts without covers", async () => {
    await seed("covered", "needle");
    await seed("plain", "needle");
    await db.insert(schema.media).values({
      id: "cover",
      key: "internal/storage-key.jpg",
      name: "private-name.jpg",
      size: 12345,
      type: "image/jpeg",
      url: "https://images.example.test/cover.jpg",
      width: 1200,
      height: 800,
      color: "#123456",
    });
    await db
      .update(schema.post)
      .set({ coverId: "cover" })
      .where(eq(schema.post.id, "covered"));
    const result = await caller().search({ query: "needle", locale: "en" });
    expect(result).toEqual([
      {
        id: "covered",
        title: "needle",
        excerpt: "",
        type: PostType.ARTICLE,
        cover: { url: "https://images.example.test/cover.jpg" },
      },
      {
        id: "plain",
        title: "needle",
        excerpt: "",
        type: PostType.ARTICLE,
        cover: null,
      },
    ]);
    await db.update(schema.media).set({ width: null, height: null });
    expect(
      (await caller().search({ query: "needle", locale: "en" }))[0]?.cover,
    ).toEqual({
      url: "https://images.example.test/cover.jpg",
    });
  });

  it("caps results at 20 with a deterministic newest-first order", async () => {
    for (let i = 0; i < 22; i++)
      await seed(`post-${String(i).padStart(2, "0")}`, "needle");
    await db.insert(schema.post).values({
      id: "newest",
      authorId: "author",
      categoryId: "category",
      status: PostStatus.PUBLISHED,
      createdAt: "2026-02-01T00:00:00Z",
    });
    await db
      .insert(schema.postTranslation)
      .values({ postId: "newest", locale: MultiLangEnum.En, title: "needle" });
    const result = await caller().search({ query: "needle", locale: "en" });
    expect(result).toHaveLength(20);
    expect(result.map((row) => row.id)).toEqual([
      "newest",
      ...Array.from(
        { length: 19 },
        (_, i) => `post-${String(i).padStart(2, "0")}`,
      ),
    ]);
  });

  it("searches and excerpts the quote body only for quote posts", async () => {
    await seed("quote", "A quotation", "Unused article body");
    await seed("article", "An article", "Article body");
    await db
      .update(schema.post)
      .set({ type: PostType.QUOTE })
      .where(eq(schema.post.id, "quote"));
    await db
      .update(schema.postTranslation)
      .set({ quoteContent: "<p>needle &amp; wisdom</p>" });
    await expect(
      caller().search({ query: "needle", locale: "en" }),
    ).resolves.toEqual([
      {
        id: "quote",
        title: "A quotation",
        excerpt: "needle & wisdom",
        type: PostType.QUOTE,
        cover: null,
      },
    ]);
    await expect(
      caller().search({ query: "Unused article", locale: "en" }),
    ).resolves.toEqual([]);
  });

  it("returns an empty array for no matches", async () => {
    await expect(
      caller().search({ query: "missing", locale: "en" }),
    ).resolves.toEqual([]);
  });

  it.each(["", "   ", "x".repeat(101)])(
    "rejects invalid query length",
    async (query) => {
      await expect(
        caller().search({ query, locale: "en" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    },
  );

  it("rejects unsupported locales", async () => {
    await expect(
      // @ts-expect-error Deliberately invalid transport input.
      caller().search({ query: "needle", locale: "fr" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
