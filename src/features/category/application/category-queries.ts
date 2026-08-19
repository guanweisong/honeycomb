import "server-only";
import type { CategoryListInput, CategoryRepository, CategoryVisibility } from "../infrastructure/category-repository";
export type { CategoryListInput, CategoryVisibility } from "../infrastructure/category-repository";
/** 查询分类列表并构建分类树。 */
export function getCategoryList(repository: CategoryRepository, input: CategoryListInput, visibility: CategoryVisibility = "PUBLIC_ONLY") {
  return repository.list(input, visibility);
}
