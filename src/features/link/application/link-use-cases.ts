import type {
  LinkInsert,
  LinkListInput,
  LinkRepository,
  LinkUpdate,
  LinkVisibility,
} from "./repository";

/** 创建友情链接用例。 */
export function createLink(repository: Pick<LinkRepository, "create">, input: LinkInsert) {
  return repository.create(input);
}
/** 更新友情链接用例。 */
export function updateLink(repository: Pick<LinkRepository, "update">, input: LinkUpdate) {
  return repository.update(input);
}
/** 批量删除友情链接用例。 */
export function destroyLinks(repository: Pick<LinkRepository, "destroy">, ids: string[]) {
  return repository.destroy(ids);
}
/** 查询友情链接列表用例。 */
export function getLinkList(
  repository: Pick<LinkRepository, "list">,
  input: LinkListInput,
  visibility: LinkVisibility = "PUBLIC_ONLY",
) {
  return repository.list(input, visibility);
}
