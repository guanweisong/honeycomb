import "server-only";

import { eq, type InferInsertModel } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

type DeepPartial<T> = {
  [Key in keyof T]?: NonNullable<T[Key]> extends object
    ? DeepPartial<NonNullable<T[Key]>>
    : T[Key];
};

/** 更新网站设置。 */
export async function updateSetting(
  db: Database,
  input: { id: string } & DeepPartial<InferInsertModel<typeof schema.setting>>,
) {
  const { id, ...changes } = input;
  const [setting] = await observeDbOperation("setting.update", "update", () =>
    db
      .update(schema.setting)
      .set(changes as Partial<InferInsertModel<typeof schema.setting>>)
      .where(eq(schema.setting.id, id))
      .returning(),
  );
  return setting;
}
