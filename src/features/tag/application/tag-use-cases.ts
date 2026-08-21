import type {
  TagInsert,
  TagListInput,
  TagRepository,
  TagUpdate,
} from "./repository";

/** 创建标签用例。 */
export function createTag(repository: TagRepository, input: TagInsert) {
  return repository.create(input);
}
/** 更新标签用例。 */
export function updateTag(repository: TagRepository, input: TagUpdate) {
  return repository.update(input);
}
/** 批量删除标签用例。 */
export function destroyTags(repository: TagRepository, ids: string[]) {
  return repository.destroy(ids);
}
/** 查询标签列表用例。 */
export function getTagList(repository: TagRepository, input: TagListInput) {
  return repository.list(input);
}
