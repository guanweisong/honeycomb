import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { supportedLanguages } from "@/packages/domain/localization/i18n";
import {
  PublicCacheInvalidationPlanSchema,
} from "@/packages/application/public-content-invalidator";
import { bumpCacheVersion } from "@/packages/infrastructure/cache/upstash-cache";
import {
  POST_CACHE_NAMESPACE,
  POST_CACHE_VERSION_KEY,
  SITEMAP_CACHE_TAG,
} from "@/packages/infrastructure/cache/public-cache-keys";

/**
 * 根据服务端持有的内容引用刷新所有语言的详情页。
 * 只接受结构化标识，不暴露任意路径缓存失效能力。
 */
async function invalidate(input: unknown) {
  const plan = PublicCacheInvalidationPlanSchema.parse(input);
  const references = new Map(
    plan.contents?.map((reference) => [
      `${reference.type}:${reference.id}`,
      reference,
    ]),
  );

  if (plan.refreshPostIndex) {
    await bumpCacheVersion(POST_CACHE_NAMESPACE, POST_CACHE_VERSION_KEY);
  }
  if (plan.refreshSitemap) {
    revalidateTag(SITEMAP_CACHE_TAG, { expire: 0 });
  }
  for (const { id, type } of references.values()) {
    const segment = type === "post" ? "archives" : "pages";
    for (const locale of supportedLanguages) {
      revalidatePath(`/${locale}/${segment}/${id}`);
    }
  }
  if (plan.refreshLayout) revalidatePath("/[locale]", "layout");
}

/** Next.js 公开缓存失效适配器；只接受 Application 定义的结构化目标。 */
export const publicContentInvalidator = {
  invalidate,
};
