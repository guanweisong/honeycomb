// @vitest-environment node
import { createClient } from "@libsql/client/node";
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
import { UserLevel, UserStatus } from "@/features/user/user";
import * as schema from "@/lib/db/schema";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import { getSetting, updateSetting } from "@/features/setting/server";
import type { Database } from "@/lib/db/db";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));

describe("setting localized persistence", () => {
  let directory: string;
  let client: ReturnType<typeof createClient>;
  let database: Database;
  const invalidator = {
    invalidate: async () => ({ state: "completed" as const }),
  };

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-setting-"));
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    if (typeof process.getuid === "function")
      expect(stat.uid).toBe(process.getuid());
    client = createClient({ url: `file:${join(directory, "setting.db")}` });
    for (const file of readdirSync("drizzle")
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await client.executeMultiple(readFileSync(join("drizzle", file), "utf8"));
    }
    const db = drizzle(client, { schema });
    await db.insert(schema.user).values({
      id: "actor",
      name: "Admin",
      email: "setting-admin@example.test",
      emailVerified: true,
      level: UserLevel.ADMIN,
      status: UserStatus.ENABLE,
    });
    await db.insert(schema.setting).values({ id: "444444444444444444444444" });
    await db.insert(schema.settingTranslation).values([
      {
        settingId: "444444444444444444444444",
        locale: MultiLangEnum.En,
        siteName: "Original",
        siteSubName: "Subtitle",
      },
      {
        settingId: "444444444444444444444444",
        locale: MultiLangEnum.Zh,
        siteName: "原始",
        siteSubName: "副标题",
      },
    ]);
    database = db;
  });

  afterEach(() => {
    client.close();
    rmSync(directory, { recursive: true });
    expect(existsSync(directory)).toBe(false);
  });

  it("preserves omitted fields and merges partial locales", async () => {
    await updateSetting(
      database,
      {
        id: "444444444444444444444444",
        expectedVersion: 0,
        siteName: { zh: "新版" },
      },
      "actor",
      invalidator,
    );
    await expect(getSetting(database)).resolves.toMatchObject({
      siteName: { en: "Original", zh: "新版" },
      siteSubName: { en: "Subtitle", zh: "副标题" },
    });

    await updateSetting(
      database,
      { id: "444444444444444444444444", expectedVersion: 1, siteName: null },
      "actor",
      invalidator,
    );
    await expect(getSetting(database)).resolves.toMatchObject({
      siteName: null,
    });
    await expect(getSetting(database)).resolves.not.toHaveProperty(
      "singletonKey",
    );
    await expect(
      updateSetting(
        database,
        {
          id: "999999999999999999999999",
          expectedVersion: 0,
          siteRecordNo: "record",
        },
        "actor",
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
