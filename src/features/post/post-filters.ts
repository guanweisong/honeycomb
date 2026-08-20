import type { PostQueryRepository } from "./repository";
/** 构建分类筛选条件。 */
export function buildCategoryFilter(repository: PostQueryRepository, categoryId: string) { return repository.categoryFilter(categoryId); }
