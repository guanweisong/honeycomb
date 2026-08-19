import "server-only";
import type { PageInput, PageQueryRepository, PageVisibility } from "../infrastructure/page-query-repository";
export type { PageInput, PageVisibility } from "../infrastructure/page-query-repository";
/** 查询页面列表。 */
export function getPageList(repository: PageQueryRepository, input: PageInput, visibility: PageVisibility = "PUBLISHED_ONLY") { return repository.list(input, visibility); }
/** 查询页面详情。 */
export function getPageDetail(repository: PageQueryRepository, id: string, visibility: PageVisibility = "PUBLISHED_ONLY") { return repository.detail(id, visibility); }
/** 查询页面作者。 */
export function getPageAuthorById(repository: PageQueryRepository, authorId: string) { return repository.author(authorId); }
