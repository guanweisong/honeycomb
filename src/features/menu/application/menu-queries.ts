import "server-only";
import type { MenuRepository, MenuVisibility } from "../infrastructure/menu-repository";
export type { MenuVisibility } from "../infrastructure/menu-repository";
/** 查询并过滤菜单树。 */
export function getMenuList(repository: MenuRepository, visibility: MenuVisibility = "PUBLIC_ONLY") { return repository.list(visibility); }
