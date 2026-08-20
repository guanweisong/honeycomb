import "server-only";

import type { TagInsert, TagListInput, TagRepository, TagUpdate } from "./repository";

export type { TagInsert, TagListInput, TagUpdate } from "./repository";

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

/** 查询标签列表。 */
export function getTagList(repository: TagRepository, input: TagListInput) {
  return repository.list(input);
}
