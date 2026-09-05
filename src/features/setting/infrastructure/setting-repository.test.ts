import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { describe, expect, it, vi } from "vitest";
import * as schema from "@/packages/infrastructure/db/schema";
import { createSettingRepository } from "./setting-repository";

vi.mock("@/packages/infrastructure/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, operation: () => unknown) => operation(),
}));

describe("setting localized persistence", () => {
  it("preserves partial-language JSON and omitted setting fields", async () => {
    const client = createClient({ url: "file::memory:" });
    try {
      await client.execute("CREATE TABLE setting (id TEXT PRIMARY KEY, site_name TEXT NOT NULL, site_sub_name TEXT NOT NULL, site_signature TEXT NOT NULL, site_copyright TEXT NOT NULL, site_record_no TEXT, site_record_url TEXT, created_at TEXT, updated_at TEXT)");
      await client.execute({
        sql: "INSERT INTO setting (id, site_name, site_sub_name, site_signature, site_copyright) VALUES (?, ?, ?, ?, ?)",
        args: ["setting", '{"en":"Original","zh":"原始"}', '{"en":"Subtitle","zh":"副标题"}', "{}", "{}"],
      });
      const repository = createSettingRepository(drizzle(client, { schema }));
      await repository.update({ id: "setting", siteName: { zh: "新版" } });
      const stored = await client.execute("SELECT site_name, site_sub_name FROM setting WHERE id = 'setting'");
      expect(stored.rows[0]?.site_name).toBe('{"zh":"新版"}');
      expect(stored.rows[0]?.site_sub_name).toBe('{"en":"Subtitle","zh":"副标题"}');

      await repository.update({ id: "setting", siteName: null });
      const cleared = await client.execute("SELECT site_name FROM setting WHERE id = 'setting'");
      expect(cleared.rows[0]?.site_name).toBe("{}");
      await expect(repository.update({ id: "missing", siteRecordNo: "record" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      client.close();
    }
  });
});
