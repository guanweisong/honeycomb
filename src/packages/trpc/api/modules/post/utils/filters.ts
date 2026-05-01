import { eq } from "drizzle-orm";
import * as schema from "@/packages/db/schema";
import type { Database } from "@/packages/db/db";

/**
 * 构建分类筛选条件（包括子分类）
 * @param db - 数据库实例
 * @param categoryId - 分类ID
 * @returns 分类ID数组（包括父分类和所有子分类）
 */
export async function buildCategoryFilter(
  db: Database,
  categoryId: string,
): Promise<string[]> {
  const subCategories = await db
    .select()
    .from(schema.category)
    .where(eq(schema.category.parent, categoryId));
  return [categoryId, ...subCategories.map((c: { id: string }) => c.id)];
}
