import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { supportedLanguages } from "@/packages/domain/localization/i18n";

const PublicContentReferenceSchema = z.object({
  id: IdSchema,
  type: z.enum(["post", "page"]),
});

/**
 * 根据服务端持有的内容引用刷新所有语言的详情页。
 * 只接受结构化标识，不暴露任意路径缓存失效能力。
 */
export async function invalidatePublicContent(input: unknown) {
  const { id, type } = PublicContentReferenceSchema.parse(input);
  const segment = type === "post" ? "archives" : "pages";
  for (const locale of supportedLanguages) {
    revalidatePath(`/${locale}/${segment}/${id}`);
  }
  await invalidateAllPublicContent();
}

/** 刷新公开语言布局及其下所有页面，用于无法安全恢复目标引用的后台写入。 */
export async function invalidateAllPublicContent() {
  revalidatePath("/[locale]", "layout");
}
