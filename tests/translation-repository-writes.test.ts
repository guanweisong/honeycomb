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
import { createCategoryRepository } from "@/features/category/infrastructure/category-repository";
import { createCommentQueryRepository } from "@/features/comment/infrastructure/comment-query-repository";
import { createPageCommandRepository } from "@/features/page/infrastructure/page-command-repository";
import { createPageQueryRepository } from "@/features/page/infrastructure/page-query-repository";
import { createPostCommandRepository } from "@/features/post/infrastructure/post-command-repository";
import { createPostQueryRepository } from "@/features/post/infrastructure/post-query-repository";
import { createSettingRepository } from "@/features/setting/infrastructure/setting-repository";
import { createTagRepository } from "@/features/tag/infrastructure/tag-repository";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { PageStatus } from "@/packages/domain/content/page";
import { TagType } from "@/packages/domain/content/tag";
import { CommentStatus } from "@/packages/domain/content/comment";
import * as schema from "@/packages/infrastructure/db/schema";

vi.mock("@/packages/infrastructure/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, operation: () => unknown) => operation(),
}));

async function migrate(client: Client) {
  for (const file of readdirSync("drizzle").filter((name) => name.endsWith(".sql")).sort()) {
    await client.executeMultiple(readFileSync(join("drizzle", file), "utf8"));
  }
}

describe("translation repository writes", () => {
  let directory: string;
  let client: Client;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), `honeycomb-repository-${process.getuid?.() ?? "user"}-`));
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    if (typeof process.getuid === "function") expect(stat.uid).toBe(process.getuid());
    client = createClient({ url: `file:${join(directory, "repository.db")}` });
    await client.execute("pragma foreign_keys = on");
    await migrate(client);
    db = drizzle(client, { schema });
    await client.execute("insert into user (id, email) values ('author', 'author@example.com')");
  });

  afterEach(() => {
    client.close();
    rmSync(directory, { recursive: true });
    expect(existsSync(directory)).toBe(false);
  });

  it("writes required entity translations without changing repository DTOs", async () => {
    const category = await createCategoryRepository(db).create({
      id: "category",
      path: "category",
      title: { en: "Category", zh: "分类" },
      description: { en: "Description", zh: "描述" },
    });
    const tag = await createTagRepository(db).create({
      id: "tag",
      name: { en: "Tag", zh: "标签" },
    });
    const page = await createPageCommandRepository(db).create(
      {
        template: PageTemplate.DEFAULT,
        title: { en: "Page", zh: "页面" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
    );

    expect(category.title).toEqual({ en: "Category", zh: "分类" });
    expect(tag.name).toEqual({ en: "Tag", zh: "标签" });
    expect(page).toMatchObject({ id: expect.any(String) });
    expect((await client.execute("select locale, title from category_translation order by locale")).rows).toEqual([
      { locale: "en", title: "Category" },
      { locale: "zh", title: "分类" },
    ]);
    expect(await client.execute("select locale, name from tag_translation order by locale")).toMatchObject({
      rows: [
        { locale: "en", name: "Tag" },
        { locale: "zh", name: "标签" },
      ],
    });
    expect(await client.execute("select count(*) as count from page_translation")).toMatchObject({
      rows: [{ count: 2 }],
    });
  });

  it("rolls back a parent create when translation persistence fails", async () => {
    await client.execute(`create trigger reject_category_translation
      before insert on category_translation begin
      select raise(abort, 'translation rejected'); end`);

    await expect(
      createCategoryRepository(db).create({
        id: "rolled-back",
        path: "rolled-back",
        title: { en: "Category", zh: "分类" },
        description: { en: "Description", zh: "描述" },
      }),
    ).rejects.toThrow(/translation rejected/i);
    expect(await client.execute("select count(*) as count from category where id = 'rolled-back'")).toMatchObject({
      rows: [{ count: 0 }],
    });
  });

  it("preserves partial post languages and merges setting locale patches", async () => {
    await createCategoryRepository(db).create({
      id: "category",
      path: "category",
      title: { en: "Category", zh: "分类" },
      description: { en: "Description", zh: "描述" },
    });
    const post = await createPostCommandRepository(db).create(
      {
        categoryId: "category",
        title: { zh: "文章" },
        excerpt: { en: "Excerpt" },
      },
      "author",
    );
    await client.execute("insert into setting (id) values ('setting')");
    await client.execute(
      "insert into setting_translation (setting_id, locale, site_name, site_sub_name) values ('setting', 'en', 'Original', 'Subtitle'), ('setting', 'zh', '原始', '副标题')",
    );

    const settingRepository = createSettingRepository(db);
    await settingRepository.update({ id: "setting", siteName: { zh: "新版" } });
    await createPostCommandRepository(db).update({ id: post.id, title: { zh: null } });

    expect(await client.execute("select locale, title, excerpt from post_translation order by locale")).toMatchObject({
      rows: [
        { locale: "en", title: null, excerpt: "Excerpt" },
      ],
    });
    expect(await settingRepository.get()).toMatchObject({
      siteName: { en: "Original", zh: "新版" },
      siteSubName: { en: "Subtitle", zh: "副标题" },
    });
    await settingRepository.update({ id: "setting", siteName: null });
    expect(await settingRepository.get()).toMatchObject({
      siteName: null,
      siteSubName: { en: "Subtitle", zh: "副标题" },
    });
  });

  it("rolls back parent updates when a required translation update fails", async () => {
    const page = await createPageCommandRepository(db).create(
      {
        template: PageTemplate.DEFAULT,
        title: { en: "Page", zh: "页面" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
    );
    await client.execute(`create trigger reject_page_translation_update
      before update on page_translation begin
      select raise(abort, 'translation update rejected'); end`);

    await expect(
      createPageCommandRepository(db).update({
        id: page.id,
        status: PageStatus.PUBLISHED,
        title: { en: "Published", zh: "已发布" },
      }),
    ).rejects.toThrow();
    expect(await client.execute({
      sql: "select status from page where id = ?",
      args: [page.id],
    })).toMatchObject({ rows: [{ status: PageStatus.TO_AUDIT }] });
  });

  it("restores missing required translation rows during complete updates", async () => {
    const categoryRepository = createCategoryRepository(db);
    const tagRepository = createTagRepository(db);
    const pageRepository = createPageCommandRepository(db);
    const category = await categoryRepository.create({
      id: "category",
      path: "category",
      title: { en: "Category", zh: "分类" },
      description: { en: "Description", zh: "描述" },
    });
    const tag = await tagRepository.create({
      id: "tag",
      name: { en: "Tag", zh: "标签" },
    });
    const page = await pageRepository.create(
      {
        template: PageTemplate.DEFAULT,
        title: { en: "Page", zh: "页面" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
    );
    await client.execute("delete from category_translation where category_id = 'category' and locale = 'en'");
    await client.execute("delete from tag_translation where tag_id = 'tag' and locale = 'en'");
    await client.execute({
      sql: "delete from page_translation where page_id = ? and locale = 'en'",
      args: [page.id],
    });

    await categoryRepository.update({
      id: category.id,
      title: { en: "Updated category", zh: "更新分类" },
      description: { en: "Updated description", zh: "更新描述" },
    });
    await tagRepository.update({
      id: tag.id,
      name: { en: "Updated tag", zh: "更新标签" },
    });
    await pageRepository.update({
      id: page.id,
      title: { en: "Updated page", zh: "更新页面" },
      content: { en: "Updated content", zh: "更新正文" },
    });

    expect(await client.execute("select locale, title from category_translation order by locale")).toMatchObject({
      rows: [
        { locale: "en", title: "Updated category" },
        { locale: "zh", title: "更新分类" },
      ],
    });
    expect(await client.execute("select locale, name from tag_translation order by locale")).toMatchObject({
      rows: [
        { locale: "en", name: "Updated tag" },
        { locale: "zh", name: "更新标签" },
      ],
    });
    expect(await client.execute({
      sql: "select locale, title from page_translation where page_id = ? order by locale",
      args: [page.id],
    })).toMatchObject({
      rows: [
        { locale: "en", title: "Updated page" },
        { locale: "zh", title: "更新页面" },
      ],
    });
  });

  it("assembles translated titles for every admin comment relation", async () => {
    await createCategoryRepository(db).create({
      id: "category",
      path: "category",
      title: { en: "Category", zh: "分类" },
      description: { en: "Description", zh: "描述" },
    });
    const page = await createPageCommandRepository(db).create(
      {
        template: PageTemplate.DEFAULT,
        title: { en: "Page", zh: "页面" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
    );
    const post = await createPostCommandRepository(db).create(
      {
        categoryId: "category",
        title: { en: "Post", zh: "文章" },
      },
      "author",
    );
    await db.insert(schema.comment).values([
      { id: "comment-post", author: "Author", content: "Post comment", email: "post@example.com", postId: post.id, status: CommentStatus.PUBLISH },
      { id: "comment-page", author: "Author", content: "Page comment", email: "page@example.com", pageId: page.id, status: CommentStatus.PUBLISH },
      { id: "comment-custom", author: "Author", content: "Custom comment", email: "custom@example.com", customId: post.id, status: CommentStatus.PUBLISH },
    ]);

    const result = await createCommentQueryRepository(db).list({ page: 1, limit: 10 });
    const comments = Object.fromEntries(result.list.map((comment) => [comment.id, comment]));

    expect(comments["comment-post"]?.post?.title).toEqual({ en: "Post", zh: "文章" });
    expect(comments["comment-page"]?.page?.title).toEqual({ en: "Page", zh: "页面" });
    expect(comments["comment-custom"]?.custom?.title).toEqual({ en: "Post", zh: "文章" });
  });

  it("assembles stable read models and counts multilingual matches once", async () => {
    await createCategoryRepository(db).create({
      id: "category",
      path: "category",
      title: { en: "Shared category", zh: "Shared category" },
      description: { en: "Description", zh: "描述" },
    });
    await createTagRepository(db).create({
      id: "tag",
      name: { en: "Tag", zh: "标签" },
    });
    await createPageCommandRepository(db).create(
      {
        template: PageTemplate.DEFAULT,
        title: { en: "Page", zh: "页面" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
    );
    const post = await createPostCommandRepository(db).create(
      {
        categoryId: "category",
        title: { en: "Post", zh: "文章" },
        content: { en: "Content", zh: "正文" },
      },
      "author",
    );
    await createPostCommandRepository(db).updateTags({
      postId: post.id,
      tagIds: ["tag"],
      type: TagType.ACTOR,
    });

    await expect(createCategoryRepository(db).list({ title: "Shared" }, "ALL")).resolves.toMatchObject({
      total: 1,
      list: [{ title: { en: "Shared category", zh: "Shared category" } }],
    });
    await expect(createTagRepository(db).list({ name: "标签" })).resolves.toMatchObject({
      total: 1,
      list: [{ name: { en: "Tag", zh: "标签" } }],
    });
    await expect(createPageQueryRepository(db).list({ title: "页面" }, "ALL")).resolves.toMatchObject({
      total: 1,
      list: [{ title: { en: "Page", zh: "页面" }, content: { en: "Content", zh: "正文" } }],
    });
    await expect(createPostQueryRepository(db).list({ title: "文章" }, "ALL")).resolves.toMatchObject({
      total: 1,
      list: [{
        title: { en: "Post", zh: "文章" },
        content: { en: "Content", zh: "正文" },
        category: { title: { en: "Shared category", zh: "Shared category" } },
        movieActors: [{ name: { en: "Tag", zh: "标签" } }],
      }],
    });
  });
});
