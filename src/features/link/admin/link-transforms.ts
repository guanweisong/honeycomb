import type { LinkUpdate } from "@/features/link/types/link.update";
import type { LinkRecord as LinkEntity } from "@/features/link/types/link.record";

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

/**
 * 链接表单默认值的数据转换函数。
 */
