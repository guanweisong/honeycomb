import type {
  PageCreateCommand,
  PageCommandRepository,
  PageUpdateCommand,
  PageInput,
  PageQueryRepository,
  PageVisibility,
} from "./repository";
import { updatePage as updatePageThroughAggregate } from "./page-command-handlers";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";

/** 创建独立页面用例。 */
export function createPage(
  repository: Pick<PageCommandRepository, "create">,
  input: PageCreateCommand,
  authorId: string,
  invalidator: Pick<PublicContentInvalidator, "invalidateContent">,
) {
  return (async () => {
    const result = await repository.create(input, authorId);
    await invalidator.invalidateContent({ id: result.id, type: "page" });
    return result;
  })();
}
/** 批量删除独立页面用例。 */
export async function destroyPages(
  repository: Pick<PageCommandRepository, "destroy">,
  ids: string[],
  invalidator: Pick<PublicContentInvalidator, "invalidateContent">,
) {
  const result = await repository.destroy(ids);
  await Promise.all(
    ids.map((id) => invalidator.invalidateContent({ id, type: "page" })),
  );
  return result;
}
/** 更新独立页面用例。 */
export function updatePage(
  repository: Pick<PageCommandRepository, "findStatus" | "update">,
  input: PageUpdateCommand,
  invalidator: Pick<PublicContentInvalidator, "invalidateContent">,
) {
  return (async () => {
    const result = await updatePageThroughAggregate(repository, input);
    await invalidator.invalidateContent({ id: input.id, type: "page" });
    return result;
  })();
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
