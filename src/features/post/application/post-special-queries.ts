import "server-only";
import type { PostListInput } from "../infrastructure/post-query-repository";
import type { PostSpecialRepository } from "../infrastructure/post-special-repository";
export type { PostListInput as PostListQueryInput } from "../infrastructure/post-query-repository";
/** 查询公开文章列表并使用版本化缓存。 */
export function getCachedPostList(repository: PostSpecialRepository, input: PostListInput) { return repository.cachedList(input); }
/** 查询指定分类下的公开随机文章。 */
export function getRandomPostsByCategory(repository: PostSpecialRepository, categoryId: string) { return repository.randomByCategory(categoryId); }
/** 查询公开文章所属分类。 */
export function getPublishedPostCategoryId(repository: PostSpecialRepository, id: string) { return repository.publishedCategoryId(id); }
