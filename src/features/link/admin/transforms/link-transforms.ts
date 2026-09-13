import type { LinkUpdate } from "@/features/link/application/write-schema";
import type { LinkViewModel as LinkEntity } from "../../presentation/link-view-model";
import { withAdminRecordId } from "@/packages/ui/admin/action-state";

export function toLinkFormDefaults(
  record?: LinkEntity,
): Partial<LinkUpdate> | undefined {
  if (!record) return undefined;

  return {
    id: record.id,
    name: record.name,
    url: record.url,
    logo: record.logo,
    description: record.description ?? undefined,
    status: record.status ?? undefined,
  };
}

export function buildLinkUpdateInput(
  record: LinkEntity,
  values: LinkUpdate,
): LinkUpdate {
  return withAdminRecordId(record, values);
}
/**
 * 链接表单默认值和接口更新输入的数据转换函数。
 */
