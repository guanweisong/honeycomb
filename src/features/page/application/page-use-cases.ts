import type {
  PageCommandInput,
  PageCommandRepository,
  PageInput,
  PageQueryRepository,
  PageVisibility,
} from "./repository";
import { updatePage as updatePageThroughAggregate } from "./page-command-handlers";

/** 创建独立页面用例。 */
export function createPage(
  repository: Pick<PageCommandRepository, "create">,
  input: PageCommandInput,
  authorId: string,
) {
  return repository.create(input, authorId);
}
/** 批量删除独立页面用例。 */
export function destroyPages(repository: Pick<PageCommandRepository, "destroy">, ids: string[]) {
  return repository.destroy(ids);
}
/** 更新独立页面用例。 */
export function updatePage(
  repository: Pick<PageCommandRepository, "findStatus" | "update">,
  input: PageCommandInput & { id: string },
) {
  return updatePageThroughAggregate(repository, input);
}
/** 增加公开页面浏览量用例。 */
export function incrementPageViews(
  repository: Pick<PageCommandRepository, "incrementViews">,
  id: string,
) {
  return repository.incrementViews(id);
}
/** 查询页面列表用例。 */
export function getPageList(
  repository: Pick<PageQueryRepository, "list">,
  input: PageInput,
  visibility: PageVisibility = "PUBLISHED_ONLY",
) {
  return repository.list(input, visibility);
}
/** 查询页面详情用例。 */
export function getPageDetail(
  repository: Pick<PageQueryRepository, "detail">,
  id: string,
  visibility: PageVisibility = "PUBLISHED_ONLY",
) {
  return repository.detail(id, visibility);
}
/** 查询页面作者用例。 */
export function getPageAuthorById(
  repository: Pick<PageQueryRepository, "author">,
  authorId: string,
) {
  return repository.author(authorId);
}
