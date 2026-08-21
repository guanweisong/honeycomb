import type { PostQueryRepository } from "./application/repository";
/** 构建分类筛选条件。 */
export function buildCategoryFilter(repository: PostQueryRepository, categoryId: string) { return repository.categoryFilter(categoryId); }
