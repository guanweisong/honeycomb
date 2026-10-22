// @vitest-environment node
import { createClient, type Client } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { existsSync, lstatSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import {
  destroyCategories,
  updateCategory,
} from "@/features/category/server/category-commands";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));

const changed = { en: "After", zh: "之后" };
const cache = (state: "completed" | "degraded" = "completed") => ({
  invalidate: vi.fn().mockResolvedValue({ state }),
});

describe("Category update transaction result boundary", () => {
  let directory: string | undefined;
  let client: Client | undefined;
  let db: Database;
  let committed: boolean;
  let failTranslationRead: "never" | "always" | "after-commit";
  let translationReadPhases: boolean[];
  let statementBindings: number[];

  afterEach(() => {
    vi.restoreAllMocks();
    client?.close();
    client = undefined;
    if (directory) {
      rmSync(directory, { recursive: true, force: true });
      expect(existsSync(directory)).toBe(false);
      directory = undefined;
    }
  });

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-category-boundary-"));
    const info = lstatSync(directory);
    expect(info.isSymbolicLink()).toBe(false);
    if (process.getuid) expect(info.uid).toBe(process.getuid());
    client = createClient({ url: `file:${join(directory, "test.db")}` });
    committed = false;
    failTranslationRead = "never";
    translationReadPhases = [];
    statementBindings = [];
    db = drizzle(client, {
      schema,
      logger: {
        logQuery(query, params) {
          statementBindings.push(params.length);
          if (
            !query.startsWith("select ") ||
            !query.includes('from "category_translation"')
          )
            return;
          translationReadPhases.push(committed);
          if (
            failTranslationRead === "always" ||
            (failTranslationRead === "after-commit" && committed)
          ) {
            throw new Error("translation read unavailable");
          }
        },
      },
    });
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.insert(schema.category).values({ id: "subject", path: "before" });
    await db.insert(schema.categoryTranslation).values([
      {
        categoryId: "subject",
        locale: MultiLangEnum.En,
        title: "Before",
        description: "Description",
      },
      {
        categoryId: "subject",
        locale: MultiLangEnum.Zh,
        title: "之前",
        description: "描述",
      },
    ]);
    // Observe the real driver's successful COMMIT, not merely callback completion.
    const transaction = client.transaction.bind(client);
    vi.spyOn(client, "transaction").mockImplementation(async (...args) => {
      const tx = await transaction(...args);
      const commit = tx.commit.bind(tx);
      vi.spyOn(tx, "commit").mockImplementation(async () => {
        await commit();
        committed = true;
      });
      return tx;
    });
  });

  async function seedDeleteBatch() {
    const ids = Array.from({ length: 1101 }, (_, index) =>
      (index + 1).toString(16).padStart(24, "0"),
    );
    for (let offset = 0; offset < ids.length; offset += 100) {
      await db
        .insert(schema.category)
        .values(
          ids
            .slice(offset, offset + 100)
            .map((id) => ({ id, path: `delete-${id}` })),
        );
    }
    await db
      .insert(schema.category)
      .values({ id: "unselected-child", path: "child", parent: ids[0] });
    await db.insert(schema.categoryTranslation).values({
      categoryId: ids.at(0) ?? "missing",
      locale: MultiLangEnum.En,
      title: "Selected",
      description: "",
    });
    await db.insert(schema.menu).values([
      { id: "menu-late", categoryId: ids[700], power: 0, type: "CATEGORY" },
      { id: "menu-last", categoryId: ids[1100], power: 1, type: "CATEGORY" },
    ]);
    return ids;
  }

  it("deletes a large selection atomically with bounded SQL and one menu revision", async () => {
    const ids = await seedDeleteBatch();
    const invalidator = cache();
    statementBindings = [];
    await expect(destroyCategories(db, ids, invalidator)).resolves.toEqual({
      success: true,
      publicSync: "completed",
    });
    expect(Math.max(...statementBindings)).toBeLessThanOrEqual(999);
    expect(client?.transaction).toHaveBeenCalledOnce();
    expect(
      await db.select().from(schema.category).orderBy(schema.category.id),
    ).toMatchObject([
      { id: "subject" },
      { id: "unselected-child", parent: null },
    ]);
    expect(await db.select().from(schema.menuRevision)).toMatchObject([
      { version: 1 },
    ]);
    expect(await db.select().from(schema.menu)).toMatchObject([
      { categoryId: null },
      { categoryId: null },
    ]);
    expect(await db.select().from(schema.categoryTranslation)).toHaveLength(2);
    expect(invalidator.invalidate).toHaveBeenCalledOnce();
  });

  it("rolls back earlier delete chunks and menu revision when a later category has a post", async () => {
    const ids = await seedDeleteBatch();
    await db.insert(schema.user).values({
      id: "author",
      name: "Author",
      email: "author@example.test",
      emailVerified: false,
    });
    await db.insert(schema.post).values({
      id: "post",
      authorId: "author",
      categoryId: ids.at(1100) ?? "missing",
    });
    const invalidator = cache();
    await expect(destroyCategories(db, ids, invalidator)).rejects.toThrow();
    expect(committed).toBe(false);
    expect(client?.transaction).toHaveBeenCalledOnce();
    expect(await db.select().from(schema.category)).toHaveLength(1103);
    expect(await db.select().from(schema.menuRevision)).toMatchObject([
      { version: 0 },
    ]);
    expect(
      await db.select().from(schema.menu).orderBy(schema.menu.power),
    ).toMatchObject([{ categoryId: ids[700] }, { categoryId: ids[1100] }]);
    expect(await db.select().from(schema.categoryTranslation)).toHaveLength(3);
    expect(
      (await db.select().from(schema.category)).find(
        ({ id }) => id === "unselected-child",
      )?.parent,
    ).toBe(ids[0]);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });

  it.each(["completed", "degraded"] as const)(
    "returns the committed multilingual result with %s sync without a post-commit read",
    async (state) => {
      failTranslationRead = "after-commit";
      const invalidator = {
        invalidate: vi.fn(async () => {
          expect(committed).toBe(true);
          return { state };
        }),
      };
      const result = await updateCategory(
        db,
        { id: "subject", title: changed, path: "after" },
        invalidator,
      );
      expect(result).toMatchObject({
        id: "subject",
        title: changed,
        publicSync: state,
        description: { en: "Description", zh: "描述" },
        path: "after",
      });
      expect(committed).toBe(true);
      expect(client?.transaction).toHaveBeenCalledOnce();
      expect(translationReadPhases).toEqual([false]);
      expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith({
        refreshLayout: true,
        refreshPostIndex: true,
        refreshSitemap: true,
      });
      failTranslationRead = "never";
      expect(
        await db
          .select()
          .from(schema.categoryTranslation)
          .orderBy(schema.categoryTranslation.locale),
      ).toMatchObject([
        { locale: MultiLangEnum.En, title: "After" },
        { locale: MultiLangEnum.Zh, title: "之后" },
      ]);
    },
  );

  it("rolls back translated changes when assembling the result fails before commit", async () => {
    failTranslationRead = "always";
    const invalidator = cache();
    await expect(
      updateCategory(
        db,
        { id: "subject", title: changed, path: "after" },
        invalidator,
      ),
    ).rejects.toThrow("translation read unavailable");
    expect(translationReadPhases).toEqual([false]);
    expect(client?.transaction).toHaveBeenCalledOnce();
    failTranslationRead = "never";
    expect(
      await db
        .select()
        .from(schema.categoryTranslation)
        .orderBy(schema.categoryTranslation.locale),
    ).toMatchObject([
      { locale: MultiLangEnum.En, title: "Before" },
      { locale: MultiLangEnum.Zh, title: "之前" },
    ]);
    expect(await db.select().from(schema.category)).toMatchObject([
      { id: "subject", path: "before" },
    ]);
    expect(committed).toBe(false);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});
