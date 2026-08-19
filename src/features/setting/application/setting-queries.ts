import "server-only";
import type { SettingRepository } from "../infrastructure/setting-repository";
/** 查询网站设置。 */
export function getSetting(repository: SettingRepository) { return repository.get(); }
