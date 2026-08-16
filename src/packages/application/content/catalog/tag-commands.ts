import "server-only";

import { eq, inArray, type InferInsertModel } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

/** 创建标签。 */
export async function createTag(db: Database, input: unknown) {
  const [value] = await observeDbOperation("tag.create", "insert", () =>
    db
      .insert(schema.tag)
      .values(input as typeof schema.tag.$inferInsert)
      .returning(),
  );
  return value;
}

/** 更新标签。 */
export async function updateTag(
  db: Database,
  input: { id: string } & Partial<InferInsertModel<typeof schema.tag>>,
) {
  const { id, ...changes } = input;
  const [value] = await observeDbOperation("tag.update", "update", () =>
    db.update(schema.tag).set(changes).where(eq(schema.tag.id, id)).returning(),
  );
  return value;
}

/** 批量删除标签。 */
export async function destroyTags(db: Database, ids: string[]) {
  await observeDbOperation("tag.destroy", "delete", () =>
    db.delete(schema.tag).where(inArray(schema.tag.id, ids)),
  );
  return { success: true as const };
}
