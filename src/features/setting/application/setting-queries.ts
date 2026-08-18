import "server-only";

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
