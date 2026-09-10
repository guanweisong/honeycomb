import "server-only";
import { revalidatePath } from "next/cache";
import { supportedLanguages } from "@/packages/domain/localization/i18n";
import {
  PublicContentReferenceSchema,
  type PublicContentInvalidator,
} from "@/packages/application/public-content-invalidator";

/**
 * 根据服务端持有的内容引用刷新所有语言的详情页。
 * 只接受结构化标识，不暴露任意路径缓存失效能力。
 */
async function invalidateContent(input: unknown) {
  const { id, type } = PublicContentReferenceSchema.parse(input);
  const segment = type === "post" ? "archives" : "pages";
  for (const locale of supportedLanguages) {
    revalidatePath(`/${locale}/${segment}/${id}`);
  }
  await invalidateAll();
}

/** 刷新公开语言布局及其下所有页面，用于无法安全恢复目标引用的后台写入。 */
async function invalidateAll() {
  revalidatePath("/[locale]", "layout");
}

/** Next.js 公开缓存失效适配器；只接受 Application 定义的结构化目标。 */
export const publicContentInvalidator: PublicContentInvalidator = {
  invalidateContent,
  invalidateAll,
};
