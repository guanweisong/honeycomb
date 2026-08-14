import "server-only";

import { eq } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

/** 查询网站设置。 */
export async function getSetting(db: Database) {
  const list = await observeDbOperation("setting.get", "select", () =>
    db.select().from(schema.setting),
  );
  return list[0];
}

/** 更新网站设置。 */
export async function updateSetting(
  db: Database,
  input: { id: string } & Record<string, unknown>,
) {
  const { id, ...rest } = input;
  const [setting] = await observeDbOperation("setting.update", "update", () =>
    db
      .update(schema.setting)
      .set(rest as Partial<typeof schema.setting.$inferInsert>)
      .where(eq(schema.setting.id, id))
      .returning(),
  );
  return setting;
}
