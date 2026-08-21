import type { MenuInput, MenuRepository, MenuVisibility } from "./repository";

/** 覆盖式保存完整菜单结构用例。 */
export function saveAllMenus(repository: MenuRepository, input: MenuInput) {
  return repository.saveAll(input);
}
/** 查询并过滤菜单树用例。 */
export function getMenuList(
  repository: MenuRepository,
  visibility: MenuVisibility = "PUBLIC_ONLY",
) {
  return repository.list(visibility);
}
