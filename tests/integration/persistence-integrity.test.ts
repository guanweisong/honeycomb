import type { Client } from "@libsql/client/node";
import { withTestDatabase } from "@tests/helpers/local-test-database";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { aroundEach, describe, expect, it } from "vitest";

describe("persistence invariants from deployed migrations", () => {
  let client: Client;

  aroundEach((runTest) =>
    withTestDatabase(async (localClient) => {
      client = localClient;
      await client.execute("pragma foreign_keys = on");
      await migrate(drizzle(client), { migrationsFolder: "drizzle" });
      await client.execute(
        "insert into user (id, email) values ('author', 'author@example.test')",
      );
      await client.execute(
        "insert into category (id, path) values ('category', 'category')",
      );
      await client.execute(
        "insert into page (id, author_id) values ('page', 'author')",
      );
      await client.execute(
        "insert into post (id, author_id, category_id) values ('post', 'author', 'category')",
      );
      await client.execute("insert into tag (id) values ('tag')");
      await client.execute("insert into setting (id) values ('setting')");
      await runTest();
    }),
  );

  it.each([
    [
      "category.status",
      "insert into category (id, path, status) values ('bad-category', 'bad-category', 'BROKEN')",
    ],
    [
      "post.status",
      "insert into post (id, author_id, category_id, status) values ('bad-post-status', 'author', 'category', 'BROKEN')",
    ],
    [
      "post.type",
      "insert into post (id, author_id, category_id, type) values ('bad-post-type', 'author', 'category', 'BROKEN')",
    ],
    [
      "post.comment_status",
      "insert into post (id, author_id, category_id, comment_status) values ('bad-comment-status', 'author', 'category', 'BROKEN')",
    ],
    [
      "page.status",
      "insert into page (id, author_id, status) values ('bad-page-status', 'author', 'BROKEN')",
    ],
    [
      "page.template",
      "insert into page (id, author_id, template) values ('bad-page-template', 'author', 'BROKEN')",
    ],
    [
      "comment.status",
      "insert into comment (id, author, content, email, custom_id, status) values ('bad-comment', 'A', 'C', 'a@example.test', 'custom', 'BROKEN')",
    ],
    [
      "user.level",
      "insert into user (id, email, level) values ('bad-level', 'level@example.test', 'BROKEN')",
    ],
    [
      "user.status",
      "insert into user (id, email, status) values ('bad-user-status', 'status@example.test', 'BROKEN')",
    ],
    [
      "menu.type",
      "insert into menu (id, power, type) values ('bad-menu', 0, 'BROKEN')",
    ],
    [
      "post_tag.type",
      "insert into post_tag (post_id, tag_id, type) values ('post', 'tag', 'BROKEN')",
    ],
    [
      "login_history.event",
      "insert into login_history (id, user_id, event, created_at) values ('bad-event', 'author', 'BROKEN', 1)",
    ],
    [
      "link.status",
      "insert into link (id, url, name, logo, status) values ('bad-link', 'https://bad.example.test', 'Bad', 'https://bad.example.test/logo.png', 'BROKEN')",
    ],
  ])("rejects an unknown %s", async (_field, statement) => {
    await expect(client.execute(statement)).rejects.toThrow(/constraint/i);
  });

  it.each([
    [
      "post.views",
      "insert into post (id, author_id, category_id, views) values ('negative-post', 'author', 'category', -1)",
    ],
    [
      "page.views",
      "insert into page (id, author_id, views) values ('negative-page', 'author', -1)",
    ],
    [
      "media.size",
      "insert into media (id, key, name, size, type, url) values ('negative-size', 'size', 'size', -1, 'image/png', 'https://example.test/size')",
    ],
    [
      "media.width",
      "insert into media (id, key, name, size, type, url, width) values ('negative-width', 'width', 'width', 1, 'image/png', 'https://example.test/width', -1)",
    ],
    [
      "media.height",
      "insert into media (id, key, name, size, type, url, height) values ('negative-height', 'height', 'height', 1, 'image/png', 'https://example.test/height', -1)",
    ],
  ])("rejects negative %s", async (_field, statement) => {
    await expect(client.execute(statement)).rejects.toThrow(/constraint/i);
  });

  it.each([
    [
      "zero",
      "insert into comment (id, author, content, email) values ('zero-target', 'A', 'C', 'zero@example.test')",
    ],
    [
      "multiple",
      "insert into comment (id, author, content, email, post_id, custom_id) values ('multi-target', 'A', 'C', 'multi@example.test', 'post', 'custom')",
    ],
  ])("requires exactly one comment target: %s", async (_case, statement) => {
    await expect(client.execute(statement)).rejects.toThrow(/constraint/i);
  });

  it("allows only one Setting row", async () => {
    await expect(
      client.execute("insert into setting (id) values ('second-setting')"),
    ).rejects.toThrow(/unique constraint/i);
  });
});
