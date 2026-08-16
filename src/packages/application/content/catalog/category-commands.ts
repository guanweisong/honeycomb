import "server-only";

import { eq, inArray, type InferInsertModel } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

/** 创建分类。 */
export async function createCategory(db: Database, input: unknown) {
  const [value] = await observeDbOperation("category.create", "insert", () =>
    db
      .insert(schema.category)
      .values(input as typeof schema.category.$inferInsert)
      .returning(),
  );
  return value;
}

/** 更新分类。 */
export async function updateCategory(
  db: Database,
  input: { id: string } & Partial<InferInsertModel<typeof schema.category>>,
) {
  const { id, ...changes } = input;
  const [value] = await observeDbOperation("category.update", "update", () =>
    db
      .update(schema.category)
      .set(changes)
      .where(eq(schema.category.id, id))
      .returning(),
  );
  return value;
}

/** 批量删除分类。 */
export async function destroyCategories(db: Database, ids: string[]) {
  await observeDbOperation("category.destroy", "delete", () =>
    db.delete(schema.category).where(inArray(schema.category.id, ids)),
  );
  return { success: true as const };
}
