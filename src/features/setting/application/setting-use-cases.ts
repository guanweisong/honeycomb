import type {
  SettingRepository,
  SettingUpdate,
  StatisticsType,
} from "./repository";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";

/** 更新网站设置用例。 */
export async function updateSetting(
  repository: Pick<SettingRepository, "update">,
  input: SettingUpdate,
  invalidator: Pick<PublicContentInvalidator, "invalidateAll">,
) {
  const result = await repository.update(input);
  await invalidator.invalidateAll();
  return result;
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
