// @vitest-environment node
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/packages/infrastructure/db/schema";
import { MultiLangEnum } from "@/packages/domain/localization/i18n";
import { createSettingRepository } from "./setting-repository";

vi.mock("@/packages/infrastructure/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, operation: () => unknown) => operation(),
}));

describe("setting localized persistence", () => {
  let directory: string;
  let client: ReturnType<typeof createClient>;
  let repository: ReturnType<typeof createSettingRepository>;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-setting-"));
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    if (typeof process.getuid === "function") expect(stat.uid).toBe(process.getuid());
    client = createClient({ url: `file:${join(directory, "setting.db")}` });
    for (const file of readdirSync("drizzle").filter((name) => name.endsWith(".sql")).sort()) {
      await client.executeMultiple(readFileSync(join("drizzle", file), "utf8"));
    }
    const db = drizzle(client, { schema });
    await db.insert(schema.setting).values({ id: "setting" });
    await db.insert(schema.settingTranslation).values([
      { settingId: "setting", locale: MultiLangEnum.En, siteName: "Original", siteSubName: "Subtitle" },
      { settingId: "setting", locale: MultiLangEnum.Zh, siteName: "原始", siteSubName: "副标题" },
    ]);
    repository = createSettingRepository(db);
  });

  afterEach(() => {
    client.close();
    rmSync(directory, { recursive: true });
    expect(existsSync(directory)).toBe(false);
  });

  it("preserves omitted fields and merges partial locales", async () => {
    await repository.update({ id: "setting", siteName: { zh: "新版" } });
    await expect(repository.get()).resolves.toMatchObject({
      siteName: { en: "Original", zh: "新版" },
      siteSubName: { en: "Subtitle", zh: "副标题" },
    });

    await repository.update({ id: "setting", siteName: null });
    await expect(repository.get()).resolves.toMatchObject({ siteName: null });
    await expect(repository.get()).resolves.not.toHaveProperty("singletonKey");
    await expect(repository.update({ id: "missing", siteRecordNo: "record" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
