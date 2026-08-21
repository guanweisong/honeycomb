import type {
  PageCommandInput,
  PageCommandRepository,
  PageInput,
  PageQueryRepository,
  PageVisibility,
} from "./repository";

/** 创建独立页面用例。 */
export function createPage(
  repository: PageCommandRepository,
  input: PageCommandInput,
  authorId: string,
) {
  return repository.create(input, authorId);
}
/** 批量删除独立页面用例。 */
export function destroyPages(repository: PageCommandRepository, ids: string[]) {
  return repository.destroy(ids);
}
/** 更新独立页面用例。 */
export function updatePage(
  repository: PageCommandRepository,
  input: PageCommandInput & { id: string },
) {
  return repository.update(input);
}
/** 增加公开页面浏览量用例。 */
export function incrementPageViews(
  repository: PageCommandRepository,
  id: string,
) {
  return repository.incrementViews(id);
}
/** 查询页面列表用例。 */
export function getPageList(
  repository: PageQueryRepository,
  input: PageInput,
  visibility: PageVisibility = "PUBLISHED_ONLY",
) {
  return repository.list(input, visibility);
}
/** 查询页面详情用例。 */
export function getPageDetail(
  repository: PageQueryRepository,
  id: string,
  visibility: PageVisibility = "PUBLISHED_ONLY",
) {
  return repository.detail(id, visibility);
}
/** 查询页面作者用例。 */
export function getPageAuthorById(
  repository: PageQueryRepository,
  authorId: string,
) {
  return repository.author(authorId);
}
