// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  withTestDatabase,
  prepareMigrationFolder,
} from "@tests/helpers/local-test-database";

describe("owned local test database", () => {
  it("uses separate file databases and removes each after success", async () => {
    const directories = await Promise.all(
      [1, 2].map((value) =>
        withTestDatabase(async (client, directory) => {
          await client.execute("CREATE TABLE sample(value INTEGER)");
          await client.execute({
            sql: "INSERT INTO sample VALUES (?)",
            args: [value],
          });
          expect(
            (await client.execute("SELECT value FROM sample")).rows,
          ).toEqual([{ value }]);
          return directory;
        }),
      ),
    );
    expect(new Set(directories).size).toBe(2);
    for (const directory of directories)
      expect(existsSync(directory)).toBe(false);
  });

  it("cleans up and restores signal handlers after a failed callback", async () => {
    const count = process.listenerCount("SIGTERM");
    let directory = "";
    await expect(
      withTestDatabase(async (_client, path) => {
        directory = path;
        throw new Error("fixture failure");
      }),
    ).rejects.toThrow("fixture failure");
    expect(existsSync(directory)).toBe(false);
    expect(process.listenerCount("SIGTERM")).toBe(count);
  });

  it("copies exactly the explicit journal baseline and can advance it", async () => {
    await withTestDatabase(async (_client, directory) => {
      const folder = prepareMigrationFolder(directory, 3);
      const readJournal = () =>
        JSON.parse(readFileSync(join(folder, "meta/_journal.json"), "utf8"));
      expect(
        readJournal().entries.map((entry: { idx: number }) => entry.idx),
      ).toEqual([0, 1, 2, 3]);
      expect(
        readdirSync(folder)
          .filter((name) => name.endsWith(".sql"))
          .sort(),
      ).toEqual([
        "0000_production_baseline.sql",
        "0001_sticky_shatterstar.sql",
        "0002_normalize_content_translations.sql",
        "0003_enforce_persistence_invariants.sql",
      ]);
      expect(prepareMigrationFolder(directory, 4)).toBe(folder);
      expect(
        readJournal().entries.map((entry: { idx: number }) => entry.idx),
      ).toEqual([0, 1, 2, 3, 4]);
      expect(
        readFileSync(join(folder, "0004_post_editor_revision.sql"), "utf8"),
      ).toBe(readFileSync("drizzle/0004_post_editor_revision.sql", "utf8"));
      expect(() => prepareMigrationFolder(directory, 100)).toThrow(
        "Unknown migration baseline",
      );
    });
  });
});
