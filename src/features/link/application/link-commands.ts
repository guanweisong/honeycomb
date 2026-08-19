import "server-only";
import type { LinkInsert, LinkRepository, LinkUpdate } from "../infrastructure/link-repository";
export type { LinkInsert, LinkUpdate } from "../infrastructure/link-repository";
/** 创建友情链接。 */
export function createLink(repository: LinkRepository, input: LinkInsert) { return repository.create(input); }
/** 更新友情链接。 */
export function updateLink(repository: LinkRepository, input: LinkUpdate) { return repository.update(input); }
/** 批量删除友情链接。 */
export function destroyLinks(repository: LinkRepository, ids: string[]) { return repository.destroy(ids); }
