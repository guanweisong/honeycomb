import "server-only";

import { eq, inArray, type InferInsertModel } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

/** 创建友情链接。 */
export async function createLink(db: Database, input: unknown) {
  const [value] = await observeDbOperation("link.create", "insert", () =>
    db
      .insert(schema.link)
      .values(input as typeof schema.link.$inferInsert)
      .returning(),
  );
  return value;
}

/** 更新友情链接。 */
export async function updateLink(
  db: Database,
  input: { id: string } & Partial<InferInsertModel<typeof schema.link>>,
) {
  const { id, ...changes } = input;
  const [value] = await observeDbOperation("link.update", "update", () =>
    db
      .update(schema.link)
      .set(changes)
      .where(eq(schema.link.id, id))
      .returning(),
  );
  return value;
}

/** 批量删除友情链接。 */
export async function destroyLinks(db: Database, ids: string[]) {
  await observeDbOperation("link.destroy", "delete", () =>
    db.delete(schema.link).where(inArray(schema.link.id, ids)),
  );
  return { success: true as const };
}
