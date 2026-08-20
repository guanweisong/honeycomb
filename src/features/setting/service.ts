import "server-only";
import type { SettingRepository, SettingUpdate, StatisticsType } from "./repository";
export type { SettingUpdate, StatisticsType } from "./repository";
/** 更新网站设置。 */
export function updateSetting(repository: SettingRepository, input: SettingUpdate) { return repository.update(input); }

/** 查询网站设置。 */
export function getSetting(repository: SettingRepository) { return repository.get(); }
/** 查询后台统计数据。 */
export function getStatistics(repository: SettingRepository): Promise<StatisticsType> { return repository.statistics(); }
