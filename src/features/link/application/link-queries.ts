import "server-only";
import type { LinkListInput, LinkRepository, LinkVisibility } from "../infrastructure/link-repository";
export type { LinkListInput, LinkVisibility } from "../infrastructure/link-repository";
/** 查询友情链接列表。 */
export function getLinkList(repository: LinkRepository, input: LinkListInput, visibility: LinkVisibility = "PUBLIC_ONLY") {
  return repository.list(input, visibility);
}
