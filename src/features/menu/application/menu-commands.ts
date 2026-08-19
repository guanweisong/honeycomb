import "server-only";
import type { MenuInput, MenuRepository } from "../infrastructure/menu-repository";
export type { MenuInput } from "../infrastructure/menu-repository";
/** 覆盖式保存完整菜单结构。 */
export function saveAllMenus(repository: MenuRepository, input: MenuInput) { return repository.saveAll(input); }
