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

/** 业务写入用例依赖的最小公开缓存失效端口。 */
export interface PublicContentInvalidator {
  invalidateContent(reference: PublicContentReference): Promise<void>;
  invalidateAll(): Promise<void>;
}
