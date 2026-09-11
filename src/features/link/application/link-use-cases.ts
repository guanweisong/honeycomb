import type {
  LinkInsert,
  LinkListInput,
  LinkRepository,
  LinkUpdate,
  LinkVisibility,
} from "./repository";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";

type PublicInvalidator = Pick<PublicContentInvalidator, "invalidate">;

/** 创建友情链接用例。 */
export async function createLink(
  repository: Pick<LinkRepository, "create">,
  input: LinkInsert,
  invalidator: PublicInvalidator,
) {
  const result = await repository.create(input);
  await invalidator.invalidate({ refreshLayout: true });
  return result;
}
/** 更新友情链接用例。 */
export async function updateLink(
  repository: Pick<LinkRepository, "update">,
  input: LinkUpdate,
  invalidator: PublicInvalidator,
) {
  const result = await repository.update(input);
  await invalidator.invalidate({ refreshLayout: true });
  return result;
}
/** 批量删除友情链接用例。 */
export async function destroyLinks(
  repository: Pick<LinkRepository, "destroy">,
  ids: string[],
  invalidator: PublicInvalidator,
) {
  const result = await repository.destroy(ids);
  await invalidator.invalidate({ refreshLayout: true });
  return result;
}
/** 查询友情链接列表用例。 */
export function getLinkList(
  repository: Pick<LinkRepository, "list">,
  input: LinkListInput,
  visibility: LinkVisibility = "PUBLIC_ONLY",
) {
  return repository.list(input, visibility);
}
