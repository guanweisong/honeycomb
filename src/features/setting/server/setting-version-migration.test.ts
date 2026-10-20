// @vitest-environment node
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";
import { expect, it } from "vitest";

it.each([false, true])(
  "preserves every legacy setting field with FK ON (injected restore failure: %s)",
  async (failRestore) => {
    const directory = mkdtempSync(join(tmpdir(), "honeycomb-setting-upgrade-"));
    let client: ReturnType<typeof createClient> | undefined;
    try {
      const stat = lstatSync(directory);
      expect(stat.isSymbolicLink()).toBe(false);
      if (process.getuid) expect(stat.uid).toBe(process.getuid());
      const migrationFolder = join(directory, "before-site-version");
      mkdirSync(join(migrationFolder, "meta"), { recursive: true });
      const journal = z
        .object({
          version: z.string(),
          dialect: z.string(),
          entries: z.array(
            z.object({
              idx: z.number(),
              version: z.string(),
              when: z.number(),
              tag: z.string(),
              breakpoints: z.boolean(),
            }),
          ),
        })
        .parse(JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")));
      const entries = journal.entries.filter((entry) => entry.idx <= 5);
      writeFileSync(
        join(migrationFolder, "meta", "_journal.json"),
        JSON.stringify({ ...journal, entries }),
      );
      for (const entry of entries)
        copyFileSync(
          `drizzle/${entry.tag}.sql`,
          join(migrationFolder, `${entry.tag}.sql`),
        );
      client = createClient({ url: `file:${join(directory, "legacy.db")}` });
      const db = drizzle(client);
      await migrate(db, { migrationsFolder: migrationFolder });
      await client.execute("PRAGMA foreign_keys=ON");
      expect(
        (await client.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
      ).toBe(1);
      await client.execute(
        "INSERT INTO setting (id, singleton_key, site_record_no, site_record_url, created_at, updated_at) VALUES ('legacy-setting', 1, 'legacy-record', 'https://example.test', 'created', 'updated')",
      );
      await client.execute(
        "INSERT INTO setting_translation (setting_id, locale, site_name, site_sub_name, site_signature, site_copyright) VALUES ('legacy-setting', 'zh', '原有名称', '副标题', '签名', '版权'), ('legacy-setting', 'en', 'Original', 'Subtitle', 'Signature', 'Copyright')",
      );
      const legacyParent = (await client.execute("SELECT * FROM setting")).rows;
      const legacyTranslations = (
        await client.execute(
          "SELECT * FROM setting_translation ORDER BY locale",
        )
      ).rows;
      if (failRestore) {
        await client.execute(
          "CREATE TRIGGER inject_setting_restore_failure BEFORE INSERT ON setting_translation BEGIN SELECT RAISE(ABORT, 'restore failure'); END",
        );
        await expect(
          migrate(db, { migrationsFolder: "drizzle" }),
        ).rejects.toThrow();
        expect((await client.execute("SELECT * FROM setting")).rows).toEqual(
          legacyParent,
        );
        expect(
          (
            await client.execute(
              "SELECT * FROM setting_translation ORDER BY locale",
            )
          ).rows,
        ).toEqual(legacyTranslations);
        expect(
          (
            await client.execute(
              "SELECT name FROM sqlite_master WHERE name IN ('menu_revision', '__setting_version_backup', '__setting_translation_version_backup')",
            )
          ).rows,
        ).toEqual([]);
        expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
          [],
        );
        return;
      }
      await migrate(db, { migrationsFolder: "drizzle" });
      expect(
        (
          await client.execute(
            "SELECT id, singleton_key, site_record_no, site_record_url, created_at, updated_at FROM setting",
          )
        ).rows,
      ).toEqual(legacyParent);
      expect(
        (
          await client.execute(
            "SELECT * FROM setting_translation ORDER BY locale",
          )
        ).rows,
      ).toEqual(legacyTranslations);
      expect(
        (
          await client.execute(
            "SELECT name FROM sqlite_master WHERE name IN ('__setting_version_backup', '__setting_translation_version_backup')",
          )
        ).rows,
      ).toEqual([]);
      const columns = await client.execute("PRAGMA table_info(setting)");
      expect(columns.rows.map((row) => row.name)).toEqual([
        "id",
        "version",
        "singleton_key",
        "site_record_no",
        "site_record_url",
        "created_at",
        "updated_at",
      ]);
      const definition = await client.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'setting'",
      );
      expect(definition.rows[0]?.sql).toContain(
        'CONSTRAINT "setting_version_check" CHECK("setting"."version" >= 0)',
      );
      const parent = await client.execute(
        "SELECT id, version, site_record_no FROM setting",
      );
      expect(parent.rows).toEqual([
        { id: "legacy-setting", version: 0, site_record_no: "legacy-record" },
      ]);
      const translation = await client.execute(
        "SELECT setting_id, locale, site_name FROM setting_translation ORDER BY locale",
      );
      expect(translation.rows).toEqual([
        { setting_id: "legacy-setting", locale: "en", site_name: "Original" },
        { setting_id: "legacy-setting", locale: "zh", site_name: "原有名称" },
      ]);
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
      expect(
        (
          await client.execute(
            "SELECT singleton_key, version FROM menu_revision",
          )
        ).rows,
      ).toEqual([{ singleton_key: 1, version: 0 }]);
    } finally {
      client?.close();
      rmSync(directory, { recursive: true, force: true });
      expect(existsSync(directory)).toBe(false);
    }
  },
);
