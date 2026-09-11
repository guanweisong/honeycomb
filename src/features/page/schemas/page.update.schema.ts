import { PageInsertSchema } from "@/features/page/schemas/page.insert.schema";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { hasUpdateFields } from "@/packages/application/validation";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import type { z } from "zod";
import type { PageUpdateCommand } from "../application/repository";

/**
 * 更新独立页面时的数据验证 schema。
 */
export const PageUpdateSchema = PageInsertSchema.partial().extend({
  id: IdSchema,
}).refine(hasUpdateFields, "至少修改一个字段");

export type PageUpdate = CleanZod<typeof PageUpdateSchema>;

type Assert<T extends true> = T;
export type PageUpdateOutputMatchesCommand = Assert<
  z.output<typeof PageUpdateSchema> extends PageUpdateCommand ? true : false
>;
