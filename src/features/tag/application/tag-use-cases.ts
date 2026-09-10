import type {
  TagInsert,
  TagListInput,
  TagRepository,
  TagUpdate,
} from "./repository";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";

type InvalidateAll = Pick<PublicContentInvalidator, "invalidateAll">;

/** 创建标签用例。 */
export async function createTag(
  repository: Pick<TagRepository, "create">,
  input: TagInsert,
  invalidator: InvalidateAll,
) {
  const result = await repository.create(input);
  await invalidator.invalidateAll();
  return result;
}
/** 更新标签用例。 */
export async function updateTag(
  repository: Pick<TagRepository, "update">,
  input: TagUpdate,
  invalidator: InvalidateAll,
) {
  const result = await repository.update(input);
  await invalidator.invalidateAll();
  return result;
}
/** 批量删除标签用例。 */
export async function destroyTags(
  repository: Pick<TagRepository, "destroy">,
  ids: string[],
  invalidator: InvalidateAll,
) {
  const result = await repository.destroy(ids);
  await invalidator.invalidateAll();
  return result;
}
/** 查询标签列表用例。 */
export function getTagList(
  repository: Pick<TagRepository, "list">,
  input: TagListInput,
) {
  return repository.list(input);
}
