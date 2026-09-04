import type {
  SettingRepository,
  SettingUpdate,
  StatisticsType,
} from "./repository";

/** 更新网站设置用例。 */
export function updateSetting(
  repository: Pick<SettingRepository, "update">,
  input: SettingUpdate,
) {
  return repository.update(input);
}
/** 查询网站设置用例。 */
export function getSetting(repository: Pick<SettingRepository, "get">) {
  return repository.get();
}
/** 查询后台统计数据用例。 */
export function getStatistics(
  repository: Pick<SettingRepository, "statistics">,
): Promise<StatisticsType> {
  return repository.statistics();
}
