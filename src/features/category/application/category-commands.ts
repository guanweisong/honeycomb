import "server-only";
import type { CategoryInsert, CategoryRepository, CategoryUpdate } from "../infrastructure/category-repository";
export type { CategoryInsert, CategoryUpdate } from "../infrastructure/category-repository";
/** 创建分类。 */
export function createCategory(repository: CategoryRepository, input: CategoryInsert) { return repository.create(input); }
/** 更新分类。 */
export function updateCategory(repository: CategoryRepository, input: CategoryUpdate) { return repository.update(input); }
/** 批量删除分类。 */
export function destroyCategories(repository: CategoryRepository, ids: string[]) { return repository.destroy(ids); }
