import "server-only";

import type { TagListInput, TagRepository } from "../infrastructure/tag-repository";

export type { TagListInput } from "../infrastructure/tag-repository";

/** 查询标签列表。 */
export function getTagList(repository: TagRepository, input: TagListInput) {
  return repository.list(input);
}
