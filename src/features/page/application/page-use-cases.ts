import type {
  PageCreateCommand,
  PageCommandRepository,
  PageUpdateCommand,
} from "./repository";
import { updatePage as updatePageThroughAggregate } from "./page-command-handlers";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";

/** 创建独立页面用例。 */
export function createPage(
  repository: Pick<PageCommandRepository, "create">,
  input: PageCreateCommand,
  authorId: string,
  invalidator: PublicContentInvalidator,
) {
  return (async () => {
    const result = await repository.create(input, authorId);
    await invalidator.invalidate({
      contents: [{ id: result.id, type: "page" }],
      refreshLayout: true,
      refreshSitemap: true,
    });
    return result;
  })();
}
/** 批量删除独立页面用例。 */
export async function destroyPages(
  repository: Pick<PageCommandRepository, "destroy">,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.destroy(ids);
  await invalidator.invalidate({
    contents: ids.map((id) => ({ id, type: "page" })),
    refreshLayout: true,
    refreshSitemap: true,
  });
  return result;
}
/** 更新独立页面用例。 */
export function updatePage(
  repository: Pick<PageCommandRepository, "findStatus" | "update">,
  input: PageUpdateCommand,
  invalidator: PublicContentInvalidator,
) {
  return (async () => {
    const result = await updatePageThroughAggregate(repository, input);
    await invalidator.invalidate({
      contents: [{ id: input.id, type: "page" }],
      refreshLayout: true,
      refreshSitemap: true,
    });
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
