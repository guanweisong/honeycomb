import type { SettingRepository, SettingUpdate } from "./repository";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";

/** 更新网站设置用例。 */
export async function updateSetting(
  repository: Pick<SettingRepository, "update">,
  input: SettingUpdate,
  invalidator: PublicContentInvalidator,
) {
  const result = await repository.update(input);
  await invalidator.invalidate({ refreshLayout: true });
  return result;
}
