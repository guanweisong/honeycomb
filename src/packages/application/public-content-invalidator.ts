import { z } from "zod";
import { IdSchema } from "@/packages/domain/shared/id.schema";

/** 可安全映射到公开路由的内容引用。 */
export const PublicContentReferenceSchema = z.object({
  id: IdSchema,
  type: z.enum(["post", "page"]),
});

export type PublicContentReference = z.infer<
  typeof PublicContentReferenceSchema
>;

export const PublicCacheInvalidationPlanSchema = z
  .object({
    contents: z
      .array(PublicContentReferenceSchema)
      .min(1)
      .readonly()
      .optional(),
    refreshLayout: z.literal(true).optional(),
    refreshPostIndex: z.literal(true).optional(),
    refreshSitemap: z.literal(true).optional(),
  })
  .strict()
  .refine(
    ({ contents, refreshLayout, refreshPostIndex, refreshSitemap }) =>
      Boolean(
        contents?.length ||
          refreshLayout ||
          refreshPostIndex ||
          refreshSitemap,
      ),
    { message: "缓存失效计划必须包含至少一个目标" },
  )
  .readonly();

export type PublicCacheInvalidationPlan = z.infer<
  typeof PublicCacheInvalidationPlanSchema
>;

export type PublicCacheInvalidationResult =
  | { state: "completed" }
  | { state: "degraded" };

/** 业务写入用例依赖的最小公开缓存失效端口。 */
export interface PublicContentInvalidator {
  invalidate(
    plan: PublicCacheInvalidationPlan,
  ): Promise<PublicCacheInvalidationResult>;
}
