import "server-only";
import type { SettingRepository, SettingUpdate } from "../infrastructure/setting-repository";
export type { SettingUpdate } from "../infrastructure/setting-repository";
/** 更新网站设置。 */
export function updateSetting(repository: SettingRepository, input: SettingUpdate) { return repository.update(input); }
