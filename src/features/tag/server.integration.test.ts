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
import { updateTag } from "@/features/tag/server/tag-commands";

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

describe("Tag update transaction result boundary", () => {
  let directory: string | undefined;
  let client: Client | undefined;
  let db: Database;
  let committed: boolean;
  let failTranslationRead: "never" | "always" | "after-commit";
  let translationReadPhases: boolean[];

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
    directory = mkdtempSync(join(tmpdir(), "honeycomb-tag-boundary-"));
    const info = lstatSync(directory);
    expect(info.isSymbolicLink()).toBe(false);
    if (process.getuid) expect(info.uid).toBe(process.getuid());
    client = createClient({ url: `file:${join(directory, "test.db")}` });
    committed = false;
    failTranslationRead = "never";
    translationReadPhases = [];
    db = drizzle(client, {
      schema,
      logger: {
        logQuery(query) {
          if (
            !query.startsWith("select ") ||
            !query.includes('from "tag_translation"')
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
    await db.insert(schema.tag).values({ id: "subject" });
    await db.insert(schema.tagTranslation).values([
      { tagId: "subject", locale: MultiLangEnum.En, name: "Before" },
      { tagId: "subject", locale: MultiLangEnum.Zh, name: "之前" },
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
      const result = await updateTag(
        db,
        { id: "subject", name: changed },
        invalidator,
      );
      expect(result).toMatchObject({
        id: "subject",
        name: changed,
        publicSync: state,
      });
      expect(committed).toBe(true);
      expect(client?.transaction).toHaveBeenCalledOnce();
      expect(translationReadPhases).toEqual([false]);
      expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith({
        refreshLayout: true,
        refreshPostIndex: true,
      });
      failTranslationRead = "never";
      expect(
        await db
          .select()
          .from(schema.tagTranslation)
          .orderBy(schema.tagTranslation.locale),
      ).toMatchObject([
        { locale: MultiLangEnum.En, name: "After" },
        { locale: MultiLangEnum.Zh, name: "之后" },
      ]);
    },
  );

  it("rolls back translated changes when assembling the result fails before commit", async () => {
    failTranslationRead = "always";
    const invalidator = cache();
    await expect(
      updateTag(db, { id: "subject", name: changed }, invalidator),
    ).rejects.toThrow("translation read unavailable");
    expect(translationReadPhases).toEqual([false]);
    expect(client?.transaction).toHaveBeenCalledOnce();
    failTranslationRead = "never";
    expect(
      await db
        .select()
        .from(schema.tagTranslation)
        .orderBy(schema.tagTranslation.locale),
    ).toMatchObject([
      { locale: MultiLangEnum.En, name: "Before" },
      { locale: MultiLangEnum.Zh, name: "之前" },
    ]);

    expect(committed).toBe(false);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});
