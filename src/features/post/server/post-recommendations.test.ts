// @vitest-environment node
import {
  createClient,
  type Client,
  type InStatement,
  type InArgs,
} from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtempSync, rmSync, existsSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { PostStatus } from "@/features/post/types/post.status";
import { MultiLangEnum } from "@/lib/i18n/i18n";
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, run: () => unknown) =>
    run(),
}));
vi.mock("@/lib/cache/upstash-cache", () => ({
  getCacheJSON: vi.fn(),
  getCacheVersion: vi.fn(),
  setCacheJSON: vi.fn(),
}));
import { getRandomPostsByCategory } from "./post-queries";
let directory: string | undefined;
let client: Client;
let db: Database;
afterEach(() => {
  client?.close();
  if (directory) {
    rmSync(directory, { recursive: true, force: true });
    expect(existsSync(directory)).toBe(false);
  }
  directory = undefined;
});
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "honeycomb-post-random-"));
  expect(lstatSync(directory).isSymbolicLink()).toBe(false);
  expect(lstatSync(directory).uid).toBe(process.getuid?.());
  client = createClient({ url: `file:${join(directory, "random.db")}` });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await client.execute("pragma foreign_keys = on");
  await db.insert(schema.user).values({ id: "author" });
  await db.insert(schema.category).values({ id: "category", path: "category" });
  await db.insert(schema.post).values({
    id: "post",
    authorId: "author",
    categoryId: "category",
    status: PostStatus.PUBLISHED,
  });
  await db.insert(schema.postTranslation).values({
    postId: "post",
    locale: MultiLangEnum.En,
    title: "Public title",
  });
});
it("does not combine previously published IDs with newly private translation values", async () => {
  const execute = client.execute.bind(client);
  let withdrew = false;
  vi.spyOn(client, "execute").mockImplementation(
    async (statement: InStatement, args?: InArgs) => {
      const result =
        typeof statement === "string"
          ? await execute(statement, args)
          : await execute(statement);
      const sql = typeof statement === "string" ? statement : statement.sql;
      if (!withdrew && sql.includes("random()")) {
        withdrew = true;
        await execute("UPDATE post SET status = 'DRAFT' WHERE id = 'post'");
        await execute(
          "UPDATE post_translation SET title = 'Private revision' WHERE post_id = 'post'",
        );
      }
      return result;
    },
  );
  const result = await getRandomPostsByCategory(db, "category");
  expect(withdrew).toBe(true);
  expect(result).toEqual([
    { id: "post", title: { en: "Public title" }, quoteContent: null },
  ]);
  expect(await getRandomPostsByCategory(db, "category")).toEqual([]);
});
it("limits posts rather than translation rows and projects only public random-card fields", async () => {
  await db.insert(schema.postTranslation).values({
    postId: "post",
    locale: MultiLangEnum.Zh,
    title: "公开标题",
    content: "not in random DTO",
  });
  for (let index = 0; index < 14; index++) {
    const id = `post-${index}`;
    await db.insert(schema.post).values({
      id,
      authorId: "author",
      categoryId: "category",
      status: PostStatus.PUBLISHED,
    });
    await db.insert(schema.postTranslation).values([
      { postId: id, locale: MultiLangEnum.En, title: "Public" },
      { postId: id, locale: MultiLangEnum.Zh, title: "公开" },
    ]);
  }
  const result = await getRandomPostsByCategory(db, "category");
  expect(result).toHaveLength(10);
  expect(new Set(result.map((row) => row.id)).size).toBe(10);
  for (const row of result) {
    expect(Object.keys(row).sort()).toEqual(["id", "quoteContent", "title"]);
    expect(Object.keys(row.title ?? {}).sort()).toEqual(["en", "zh"]);
  }
});
