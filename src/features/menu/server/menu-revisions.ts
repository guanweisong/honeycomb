import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { SQL_ID_CHUNK_SIZE } from "@/lib/db/query/parameter-limits";
import type { DatabaseTransaction } from "@/lib/db/transaction-begin-retry";
import { ApplicationError } from "@/lib/errors/application-error";

async function bumpMenuRevisionForTargets(
  tx: DatabaseTransaction,
  field: typeof schema.menu.pageId | typeof schema.menu.categoryId,
  ids: string[],
) {
  let hasReference = false;
  for (let offset = 0; offset < ids.length; offset += SQL_ID_CHUNK_SIZE) {
    const [affected] = await tx
      .select({ id: schema.menu.id })
      .from(schema.menu)
      .where(inArray(field, ids.slice(offset, offset + SQL_ID_CHUNK_SIZE)))
      .limit(1);
    if (affected) {
      hasReference = true;
      break;
    }
  }
  if (!hasReference) return;
  const [revision] = await tx
    .update(schema.menuRevision)
    .set({ version: sql`${schema.menuRevision.version} + 1` })
    .where(eq(schema.menuRevision.singletonKey, 1))
    .returning({ version: schema.menuRevision.version });
  if (!revision)
    throw new ApplicationError("INTERNAL_SERVER_ERROR", "菜单版本尚未初始化");
}

export async function bumpMenuRevisionForPageDeletion(
  tx: DatabaseTransaction,
  ids: string[],
) {
  await bumpMenuRevisionForTargets(tx, schema.menu.pageId, ids);
}

export async function bumpMenuRevisionForCategoryDeletion(
  tx: DatabaseTransaction,
  ids: string[],
) {
  await bumpMenuRevisionForTargets(tx, schema.menu.categoryId, ids);
}
