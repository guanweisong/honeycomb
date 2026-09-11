import type { MenuInput, MenuRepository, MenuVisibility } from "./repository";
import { ApplicationError } from "@/packages/application/errors";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";

function validateMenuTree(input: MenuInput): void {
  if (input.length === 0) throw new ApplicationError("BAD_REQUEST", "菜单不能为空");
  const ids = new Set<string>();
  for (const item of input) {
    if (ids.has(item.id))
      throw new ApplicationError("BAD_REQUEST", "菜单 ID 不能重复");
    ids.add(item.id);
  }

  const parents = new Map(input.map((item) => [item.id, item.parent ?? null]));
  for (const item of input) {
    if (item.parent === undefined || item.parent === null) continue;
    if (item.parent === item.id)
      throw new ApplicationError("BAD_REQUEST", "菜单不能将自己设置为父节点");
    if (!ids.has(item.parent))
      throw new ApplicationError("BAD_REQUEST", "菜单父节点不存在");
  }

  for (const item of input) {
    const visited = new Set<string>();
    let current: string | null | undefined = item.id;
    while (current) {
      if (visited.has(current))
        throw new ApplicationError("BAD_REQUEST", "菜单父子关系不能形成循环");
      visited.add(current);
      current = parents.get(current);
    }
  }
}

/** 覆盖式保存完整菜单结构用例。 */
export async function saveAllMenus(
  repository: Pick<MenuRepository, "saveAll">,
  input: MenuInput,
  invalidator: Pick<PublicContentInvalidator, "invalidateAll">,
) {
  validateMenuTree(input);
  const result = await repository.saveAll(input);
  await invalidator.invalidateAll();
  return result;
}
/** 查询并过滤菜单树用例。 */
export function getMenuList(
  repository: Pick<MenuRepository, "list">,
  visibility: MenuVisibility = "PUBLIC_ONLY",
) {
  return repository.list(visibility);
}
