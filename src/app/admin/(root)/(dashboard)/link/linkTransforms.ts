import type { LinkUpdate } from "@/packages/trpc/api/modules/link/schemas/link.update.schema";
import type { LinkEntity } from "@/packages/trpc/api/modules/link/types/link.entity";

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
  return { ...values, id: record.id };
}
