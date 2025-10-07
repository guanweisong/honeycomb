import { db, schema, type MultiLang } from "@honeycomb/db";
import { inArray } from "drizzle-orm";

export interface RelationTag {
  id: string;
  name: MultiLang;
}

/**
 * Fetch tags by ids, returning minimal shape for relations.
 * You can optionally inject a db instance (e.g., ctx.db); defaults to @honeycomb/db's db.
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
