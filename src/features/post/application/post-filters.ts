import type { PostQueryRepository } from "../infrastructure/post-query-repository";
/** 构建分类筛选条件。 */
export function buildCategoryFilter(repository: PostQueryRepository, categoryId: string) { return repository.categoryFilter(categoryId); }
