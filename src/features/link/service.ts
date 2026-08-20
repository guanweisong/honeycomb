import "server-only";
import type { LinkInsert, LinkListInput, LinkRepository, LinkUpdate, LinkVisibility } from "./repository";
export type { LinkInsert, LinkListInput, LinkUpdate, LinkVisibility } from "./repository";
/** 创建友情链接。 */
export function createLink(repository: LinkRepository, input: LinkInsert) { return repository.create(input); }
/** 更新友情链接。 */
export function updateLink(repository: LinkRepository, input: LinkUpdate) { return repository.update(input); }
/** 批量删除友情链接。 */
export function destroyLinks(repository: LinkRepository, ids: string[]) { return repository.destroy(ids); }

/** 查询友情链接列表。 */
export function getLinkList(repository: LinkRepository, input: LinkListInput, visibility: LinkVisibility = "PUBLIC_ONLY") {
  return repository.list(input, visibility);
}
