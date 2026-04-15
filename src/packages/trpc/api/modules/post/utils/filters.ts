import { eq } from "drizzle-orm";
import * as schema from "@/packages/db/schema";
import { buildDrizzleWhere } from "@/packages/trpc/api/libs/tools";

/**
 * 构建分类筛选条件（包括子分类）
 * @param db - 数据库实例
 * @param categoryId - 分类ID
 * @returns 分类ID数组（包括父分类和所有子分类）
 */
export async function buildCategoryFilter(
  db: any,
  categoryId: string
): Promise<string[]> {
  const subCategories = await db
    .select()
    .from(schema.category)
    .where(eq(schema.category.parent, categoryId));
  return [categoryId, ...subCategories.map((c: any) => c.id)];
}

/**
 * 构建标签筛选条件
 * @param db - 数据库实例
 * @param tagName - 标签名称
 * @returns 标签ID，如果标签不存在则返回null
 */
export async function buildTagFilter(
  db: any,
  tagName: string
): Promise<string | null> {
  const tagWhere = buildDrizzleWhere(schema.tag, { name: tagName }, [], {
    name: tagName,
  });
  const tags = await db
    .select()
    .from(schema.tag)
    .where(tagWhere)
    .limit(1);
  
  if (!tags.length) {
    return null;
  }
  return tags[0].id;
}

/**
 * 构建作者筛选条件
 * @param db - 数据库实例
 * @param userName - 用户名
 * @returns 用户ID，如果用户不存在则返回null
 */
export async function buildAuthorFilter(
  db: any,
  userName: string
): Promise<string | null> {
  const users = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.name, userName));
  
  if (!users.length) {
    return null;
  }
  return users[0].id;
}
