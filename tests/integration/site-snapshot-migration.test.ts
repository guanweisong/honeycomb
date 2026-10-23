// @vitest-environment node
import { createClient, type Client } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

async function withLegacySettings(
  run: (client: Client, folder: string) => Promise<void>,
) {
  const directory = mkdtempSync(join(tmpdir(), "honeycomb-setting-upgrade-"));
  let client: Client | undefined;
  const cleanup = () => {
    client?.close();
    client = undefined;
    rmSync(directory, { recursive: true, force: true });
  };
  const handlers = (["SIGHUP", "SIGINT", "SIGTERM"] as const).map((signal) => {
    const handler = () => {
      cleanup();
      process.exit(1);
    };
    process.once(signal, handler);
    return { signal, handler };
  });
  try {
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    if (process.getuid) expect(stat.uid).toBe(process.getuid());
    const folder = join(directory, "migrations");
    mkdirSync(join(folder, "meta"), { recursive: true });
    const journal: { entries: { idx: number }[] } = JSON.parse(
      readFileSync("drizzle/meta/_journal.json", "utf8"),
    );
    const writeJournal = (end: number) =>
      writeFileSync(
        join(folder, "meta/_journal.json"),
        JSON.stringify({
          ...journal,
          entries: journal.entries.filter(({ idx }) => idx <= end),
        }),
      );
    for (const name of readdirSync("drizzle").filter((name) =>
      /^000[0-5]_.*\.sql$/.test(name),
    ))
      copyFileSync(join("drizzle", name), join(folder, name));
    writeJournal(5);
    client = createClient({ url: `file:${join(directory, "settings.db")}` });
    await client.execute("PRAGMA foreign_keys = ON");
    await migrate(drizzle(client), { migrationsFolder: folder });
    await client.execute(
      "INSERT INTO setting (id, site_record_no, site_record_url, created_at, updated_at) VALUES ('legacy', 'record', 'https://example.test/record', '2025-01-01', '2026-01-01')",
    );
    await client.execute(
      "INSERT INTO setting_translation (setting_id, locale, site_name, site_sub_name, site_signature, site_copyright) VALUES ('legacy', 'en', 'Site', 'Subtitle', 'Signature', 'Copyright'), ('legacy', 'zh', '站点', '副标题', '签名', '版权')",
    );
    copyFileSync(
      "drizzle/0006_site_snapshot_versions.sql",
      join(folder, "0006_site_snapshot_versions.sql"),
    );
    writeJournal(6);
    await run(client, folder);
  } finally {
    cleanup();
    for (const { signal, handler } of handlers)
      process.removeListener(signal, handler);
    expect(existsSync(directory)).toBe(false);
  }
}

describe("site snapshot migration on populated SQLite", () => {
  it("preserves both setting translations and parent fields with foreign keys enabled", async () => {
    await withLegacySettings(async (client, folder) => {
      const before = (await client.execute("SELECT * FROM setting")).rows[0];
      const translations = (
        await client.execute(
          "SELECT * FROM setting_translation ORDER BY locale",
        )
      ).rows;
      await migrate(drizzle(client), { migrationsFolder: folder });
      expect(
        (await client.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
      ).toBe(1);
      expect((await client.execute("SELECT * FROM setting")).rows).toEqual([
        { ...before, version: 0 },
      ]);
      expect(
        (
          await client.execute(
            "SELECT * FROM setting_translation ORDER BY locale",
          )
        ).rows,
      ).toEqual(translations);
      expect(
        (await client.execute("SELECT * FROM menu_revision")).rows,
      ).toEqual([{ singleton_key: 1, version: 0 }]);
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
      expect(
        (
          await client.execute(
            "SELECT name FROM sqlite_master WHERE name LIKE '__setting%backup'",
          )
        ).rows,
      ).toEqual([]);
    });
  });

  it("rolls back the original setting and translations when restoration fails", async () => {
    await withLegacySettings(async (client, folder) => {
      const before = (await client.execute("SELECT * FROM setting")).rows;
      const translations = (
        await client.execute(
          "SELECT * FROM setting_translation ORDER BY locale",
        )
      ).rows;
      await client.execute(
        "CREATE TRIGGER reject_setting_restore BEFORE INSERT ON setting_translation BEGIN SELECT RAISE(ABORT, 'injected restoration failure'); END",
      );
      await expect(
        migrate(drizzle(client), { migrationsFolder: folder }),
      ).rejects.toThrow();
      expect((await client.execute("SELECT * FROM setting")).rows).toEqual(
        before,
      );
      expect(
        (
          await client.execute(
            "SELECT * FROM setting_translation ORDER BY locale",
          )
        ).rows,
      ).toEqual(translations);
      expect(
        (
          await client.execute(
            "SELECT name FROM sqlite_master WHERE name = 'menu_revision' OR name LIKE '__setting%backup'",
          )
        ).rows,
      ).toEqual([]);
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
    });
  });
});
