import { db } from "@honeycomb/db/src/db";
import * as schema from "@honeycomb/db/src/schema";
import { type MultiLang } from "@honeycomb/db/src/types";
import { inArray } from "drizzle-orm";

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
export const getRelationTags = async (
  ids: string[] = [],
): Promise<RelationTag[]> => {
  if (ids.length === 0) return [];
  return db
    .select({ id: schema.tag.id, name: schema.tag.name as any })
    .from(schema.tag)
    .where(inArray(schema.tag.id, ids));
};
