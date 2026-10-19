import type { TagInsert, TagRepository, TagUpdate } from "./repository";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";

const postIndexInvalidation = {
  refreshLayout: true,
  refreshPostIndex: true,
} as const;

/** 创建标签用例。 */
export async function createTag(
  repository: Pick<TagRepository, "create">,
  input: TagInsert,
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.create(input);
  const publicSync = await invalidator.invalidate(postIndexInvalidation);
  return { ...result, publicSync: publicSync.state };
}
/** 更新标签用例。 */
export async function updateTag(
  repository: Pick<TagRepository, "update">,
  input: TagUpdate,
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.update(input);
  const publicSync = await invalidator.invalidate(postIndexInvalidation);
  return { ...result, publicSync: publicSync.state };
}
/** 批量删除标签用例。 */
export async function destroyTags(
  repository: Pick<TagRepository, "destroy">,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.destroy(ids);
  const publicSync = await invalidator.invalidate(postIndexInvalidation);
  return { ...result, publicSync: publicSync.state };
}
