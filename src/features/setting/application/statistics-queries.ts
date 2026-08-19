import "server-only";
import type { SettingRepository, StatisticsType } from "../infrastructure/setting-repository";
export type { StatisticsType } from "../infrastructure/setting-repository";
/** 查询后台统计数据。 */
export function getStatistics(repository: SettingRepository): Promise<StatisticsType> { return repository.statistics(); }
