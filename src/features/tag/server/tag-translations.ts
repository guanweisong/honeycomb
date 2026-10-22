import "server-only";
import { inArray } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import type { I18n } from "@/lib/i18n/i18n";
import { supportedLanguages } from "@/lib/i18n/i18n";
import { assembleRequiredLocalizedField } from "@/lib/db/translation-values";

export type TagTranslationRow = typeof schema.tagTranslation.$inferSelect;

export function toTagTranslationRows(
  tagId: string,
  name: I18n,
): TagTranslationRow[] {
  return supportedLanguages.map((locale) => ({
    tagId,
    locale,
    name: name[locale],
  }));
}

export function groupTagTranslations(rows: readonly TagTranslationRow[]) {
  const grouped = new Map<string, TagTranslationRow[]>();
  for (const row of rows) {
    const values = grouped.get(row.tagId) ?? [];
    values.push(row);
    grouped.set(row.tagId, values);
  }
  return new Map(
    [...grouped].map(([id, values]) => [
      id,
      assembleRequiredLocalizedField(values, (row) => row.name),
    ]),
  );
}

export async function withTranslations<
  T extends typeof schema.tag.$inferSelect,
>(db: Pick<Database, "select">, rows: T[]) {
  if (!rows.length) return [];
  const translations = await db
    .select()
    .from(schema.tagTranslation)
    .where(
      inArray(
        schema.tagTranslation.tagId,
        rows.map(({ id }) => id),
      ),
    );
  const byId = groupTagTranslations(translations);
  return rows.map((row) => ({ ...row, name: byId.get(row.id) ?? null }));
}
