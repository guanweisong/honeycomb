import type { InferInsertModel } from "drizzle-orm";

import type { PageFields } from "@/features/page/types/page.insert";
import type * as schema from "@/lib/db/schema";

type PageInsertValues = InferInsertModel<typeof schema.page>;

export function toPageInsertValues(
  input: PageFields,
  authorId: string,
): PageInsertValues {
  return {
    authorId,
    status: input.status,
    template: input.template,
  } satisfies PageInsertValues;
}

export function toPageUpdateValues(
  input: Partial<PageFields>,
): Partial<PageInsertValues> {
  return {
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.template !== undefined ? { template: input.template } : {}),
  } satisfies Partial<PageInsertValues>;
}
