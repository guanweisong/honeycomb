import type { LinkInsert, LinkRepository, LinkUpdate } from "./repository";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";

/** 创建友情链接用例。 */
export async function createLink(
  repository: Pick<LinkRepository, "create">,
  input: LinkInsert,
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.create(input);
  await invalidator.invalidate({ refreshLayout: true });
  return result;
}
/** 更新友情链接用例。 */
export async function updateLink(
  repository: Pick<LinkRepository, "update">,
  input: LinkUpdate,
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.update(input);
  await invalidator.invalidate({ refreshLayout: true });
  return result;
}
/** 批量删除友情链接用例。 */
export async function destroyLinks(
  repository: Pick<LinkRepository, "destroy">,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.destroy(ids);
  await invalidator.invalidate({ refreshLayout: true });
  return result;
}
