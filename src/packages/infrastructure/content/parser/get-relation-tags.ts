import { getDb } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { inArray } from "drizzle-orm";
import { MultiLang } from "@/packages/domain/localization/multi-lang";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { assembleRequiredLocalizedField } from "@/packages/infrastructure/db/translation-values";

/**
 * 关联标签接口。
 * 定义了用于表示关联标签的最小结构，包含 ID 和多语言名称。
 */
export interface RelationTag {
  id: string;
  name: MultiLang;
}

/**
 * 根据 ID 列表获取关联标签。
 * 返回标签的最小形状（ID 和多语言名称），用于表示与其他实体的关联关系。
 * @param {string[]} [ids=[]] - 要获取的标签 ID 数组。
 * @returns {Promise<RelationTag[]>} 包含关联标签对象的数组。
 */
/** 根据标签 ID 批量读取内容关联标签。 */
export const getRelationTags = async (ids: string[] = []) => {
  if (ids.length === 0) return [];
  const db = getDb();
  const tags = await observeDbOperation("tag.relations", "select", () =>
    db.select({ id: schema.tag.id }).from(schema.tag).where(inArray(schema.tag.id, ids)),
  );
  if (!tags.length) return [];
  const translations = await db
    .select()
    .from(schema.tagTranslation)
    .where(inArray(schema.tagTranslation.tagId, tags.map(({ id }) => id)));
  return tags.flatMap((tag) => {
    const name = assembleRequiredLocalizedField(
      translations.filter((row) => row.tagId === tag.id),
      (row) => row.name,
    );
    return name ? [{ id: tag.id, name }] : [];
  });
};
