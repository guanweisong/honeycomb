import "server-only";
import type { CategoryInsert, CategoryListInput, CategoryRepository, CategoryUpdate, CategoryVisibility } from "./repository";
export type { CategoryInsert, CategoryListInput, CategoryUpdate, CategoryVisibility } from "./repository";
/** 创建分类。 */
export function createCategory(repository: CategoryRepository, input: CategoryInsert) { return repository.create(input); }
/** 更新分类。 */
export function updateCategory(repository: CategoryRepository, input: CategoryUpdate) { return repository.update(input); }
/** 批量删除分类。 */
export function destroyCategories(repository: CategoryRepository, ids: string[]) { return repository.destroy(ids); }

/** 查询分类列表并构建分类树。 */
export function getCategoryList(repository: CategoryRepository, input: CategoryListInput, visibility: CategoryVisibility = "PUBLIC_ONLY") {
  return repository.list(input, visibility);
}
