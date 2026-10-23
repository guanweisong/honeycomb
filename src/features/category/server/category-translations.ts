import "server-only";
import { inArray } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import { SQL_ID_CHUNK_SIZE } from "@/lib/db/query/parameter-limits";
import { parseEnumValue } from "@/lib/db/value-validation";
import { EnableStatus } from "@/lib/validation/enable-status";
import type { I18n } from "@/lib/i18n/i18n";
import { supportedLanguages } from "@/lib/i18n/i18n";
import { assembleRequiredLocalizedField } from "@/lib/db/translation-values";
import * as schema from "@/lib/db/schema";

export type CategoryTranslationRow =
  typeof schema.categoryTranslation.$inferSelect;

export function toCategoryTranslationRows(
  categoryId: string,
  title: I18n,
  description: I18n,
): CategoryTranslationRow[] {
  return supportedLanguages.map((locale) => ({
    categoryId,
    locale,
    title: title[locale],
    description: description[locale],
  }));
}

export function groupCategoryTranslations(
  rows: readonly CategoryTranslationRow[],
) {
  const grouped = Map.groupBy(rows, (row) => row.categoryId);
  return new Map(
    [...grouped].map(([id, values]) => [
      id,
      {
        title: assembleRequiredLocalizedField(values, (row) => row.title),
        description: assembleRequiredLocalizedField(
          values,
          (row) => row.description,
        ),
      },
    ]),
  );
}

export async function withTranslations<
  T extends typeof schema.category.$inferSelect,
>(db: Pick<Database, "select">, rows: T[]) {
  if (!rows.length) return [];
  const translations: (typeof schema.categoryTranslation.$inferSelect)[] = [];
  for (let offset = 0; offset < rows.length; offset += SQL_ID_CHUNK_SIZE) {
    translations.push(
      ...(await db
        .select()
        .from(schema.categoryTranslation)
        .where(
          inArray(
            schema.categoryTranslation.categoryId,
            rows.slice(offset, offset + SQL_ID_CHUNK_SIZE).map(({ id }) => id),
          ),
        )),
    );
  }
  const byId = groupCategoryTranslations(translations);
  return rows.map((row) => ({
    ...row,
    status: parseEnumValue(
      row.status,
      Object.values(EnableStatus),
      "category.status",
    ),
    title: byId.get(row.id)?.title ?? null,
    description: byId.get(row.id)?.description ?? null,
  }));
}
