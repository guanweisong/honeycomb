import type {
  CategoryInsert,
  CategoryListInput,
  CategoryRepository,
  CategoryUpdate,
  CategoryVisibility,
} from "./repository";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { ApplicationError } from "@/packages/application/errors";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";

function assertStatus(status: string | undefined): void {
  if (
    status !== undefined &&
    status !== EnableStatus.ENABLE &&
    status !== EnableStatus.DISABLE
  ) {
    throw new ApplicationError("BAD_REQUEST", "分类状态不合法");
  }
}

async function assertParentChain(
  repository: Pick<CategoryRepository, "find">,
  id: string | undefined,
  parent: string | null | undefined,
): Promise<void> {
  if (parent === undefined || parent === null) return;
  if (parent === id)
    throw new ApplicationError("BAD_REQUEST", "分类不能将自己设置为父节点");

  const visited = new Set(id ? [id] : []);
  let currentId: string | null = parent;
  while (currentId) {
    if (visited.has(currentId))
      throw new ApplicationError("BAD_REQUEST", "分类父子关系不能形成循环");
    visited.add(currentId);
    const current = await repository.find(currentId);
    if (!current) throw new ApplicationError("BAD_REQUEST", "父级分类不存在");
    currentId = current.parent;
  }
}

async function assertPath(
  repository: Pick<CategoryRepository, "pathExists">,
  path: string | undefined,
  excludeId?: string,
): Promise<void> {
  if (path !== undefined && (await repository.pathExists(path, excludeId))) {
    throw new ApplicationError("BAD_REQUEST", "分类路径已经存在");
  }
}

/** 创建分类用例。 */
export function createCategory(
  repository: Pick<CategoryRepository, "create" | "find" | "pathExists">,
  input: CategoryInsert,
  invalidator: Pick<PublicContentInvalidator, "invalidateAll">,
) {
  return (async () => {
    assertStatus(input.status);
    await assertParentChain(repository, undefined, input.parent);
    await assertPath(repository, input.path);
    const result = await repository.create(input);
    await invalidator.invalidateAll();
    return result;
  })();
}

/** 更新分类用例。 */
export function updateCategory(
  repository: Pick<CategoryRepository, "find" | "pathExists" | "update">,
  input: CategoryUpdate,
  invalidator: Pick<PublicContentInvalidator, "invalidateAll">,
) {
  return (async () => {
    const current = await repository.find(input.id);
    if (!current) throw new ApplicationError("NOT_FOUND", "分类不存在");
    assertStatus(input.status);
    await assertParentChain(repository, input.id, input.parent);
    await assertPath(repository, input.path, input.id);
    const result = await repository.update(input);
    await invalidator.invalidateAll();
    return result;
  })();
}

/** 批量删除分类用例。 */
export function destroyCategories(
  repository: Pick<CategoryRepository, "destroy">,
  ids: string[],
  invalidator: Pick<PublicContentInvalidator, "invalidateAll">,
) {
  return (async () => {
    const result = await repository.destroy(ids);
    await invalidator.invalidateAll();
    return result;
  })();
}

/** 查询分类的平面分页列表；完整树由独立 Repository 查询提供。 */
export function getCategoryList(
  repository: Pick<CategoryRepository, "list">,
  input: CategoryListInput,
  visibility: CategoryVisibility = "PUBLIC_ONLY",
) {
  return repository.list(input, visibility);
}
