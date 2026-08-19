import "server-only";

import type { TagInsert, TagRepository, TagUpdate } from "../infrastructure/tag-repository";

export type { TagInsert, TagUpdate } from "../infrastructure/tag-repository";

/** 创建标签。 */
export function createTag(repository: TagRepository, input: TagInsert) {
  return repository.create(input);
}

/** 更新标签。 */
export function updateTag(repository: TagRepository, input: TagUpdate) {
  return repository.update(input);
}

/** 批量删除标签。 */
export function destroyTags(repository: TagRepository, ids: string[]) {
  return repository.destroy(ids);
}
