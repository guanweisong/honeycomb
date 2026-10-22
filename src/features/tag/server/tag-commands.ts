import "server-only";
import { requireWriteResult } from "@/lib/db/value-validation";
import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { observeDbOperation } from "@/lib/observability/server";
import { supportedLanguages } from "@/lib/i18n/i18n";
import { toTagTranslationRows } from "@/features/tag/server/tag-translations";
import type { TagInsert } from "@/features/tag/types/tag.insert";
import type { TagUpdate } from "@/features/tag/types/tag.update";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import { withTranslations } from "@/features/tag/server/tag-translations";

export async function createTag(
  db: Database,
  input: TagInsert,
  invalidator: PublicContentInvalidator,
) {
  const persisted = await observeDbOperation("tag.create", "transaction", () =>
    db.transaction(async (tx) => {
      const { name, ...parent } = input;
      const [created] = await tx.insert(schema.tag).values(parent).returning();
      const tag = requireWriteResult(created, "create", "tag");
      await tx
        .insert(schema.tagTranslation)
        .values(toTagTranslationRows(tag.id, name));
      return { ...tag, name };
    }),
  );
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
  });
  return { ...persisted, publicSync: publicSync.state };
}

export async function updateTag(
  db: Database,
  input: TagUpdate,
  invalidator: PublicContentInvalidator,
) {
  const { id, name, ...changes } = input;
  const parentChanges = {
    ...changes,
    ...(name !== undefined ? { updatedAt: new Date().toISOString() } : {}),
  };
  const value = await observeDbOperation("tag.update", "transaction", () =>
    db.transaction(async (tx) => {
      const [updated] = Object.keys(parentChanges).length
        ? await tx
            .update(schema.tag)
            .set(parentChanges)
            .where(eq(schema.tag.id, id))
            .returning()
        : await tx
            .select()
            .from(schema.tag)
            .where(eq(schema.tag.id, id))
            .limit(1);
      if (updated && name !== undefined) {
        for (const locale of supportedLanguages) {
          await tx
            .insert(schema.tagTranslation)
            .values({ tagId: id, locale, name: name[locale] })
            .onConflictDoUpdate({
              target: [
                schema.tagTranslation.tagId,
                schema.tagTranslation.locale,
              ],
              set: { name: name[locale] },
            });
        }
      }
      if (!updated) return undefined;
      // Assemble the response before commit so a failed read rolls back the write.
      const [result] = await withTranslations(tx, [updated]);
      return requireWriteResult(result, "update", "tag");
    }),
  );
  const persisted = requireWriteResult(value, "update", "tag");
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
  });
  return { ...persisted, publicSync: publicSync.state };
}

export async function destroyTags(
  db: Database,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  await observeDbOperation("tag.destroy", "delete", () =>
    db.transaction(async (tx) => {
      await tx
        .update(schema.post)
        .set({
          version: sql`${schema.post.version} + 1`,
          updatedAt: sql`${schema.post.updatedAt}`,
        })
        .where(
          inArray(
            schema.post.id,
            tx
              .select({ postId: schema.postTag.postId })
              .from(schema.postTag)
              .where(inArray(schema.postTag.tagId, ids)),
          ),
        );
      await tx.delete(schema.tag).where(inArray(schema.tag.id, ids));
    }),
  );
  const persisted = { success: true } as const;
  const publicSync = await invalidator.invalidate({
    refreshLayout: true,
    refreshPostIndex: true,
  });
  return { ...persisted, publicSync: publicSync.state };
}
