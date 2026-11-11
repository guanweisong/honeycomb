import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { supportedLanguages } from "@/lib/i18n/i18n";
import {
  PublicCacheInvalidationPlanSchema,
  type PublicCacheInvalidationPlan,
  type PublicCacheInvalidationResult,
} from "@/lib/cache/public-content-invalidator";
import { bumpCacheVersion } from "@/lib/cache/upstash-cache";
import {
  POST_CACHE_NAMESPACE,
  POST_CACHE_VERSION_KEY,
  BLOG_LIST_CACHE_TAG,
  PAGE_DETAILS_CACHE_TAG,
  POST_DETAILS_CACHE_TAG,
  SITEMAP_CACHE_TAG,
  pageDetailCacheTag,
  postDetailCacheTag,
} from "@/lib/cache/public-cache-keys";
import { getLogger, getMetrics } from "@/lib/observability/server";
import { LogEvent, MetricName } from "@/lib/observability/core/names";

/**
 * 根据服务端持有的内容引用刷新所有语言的详情页。
 * 只接受结构化标识，不暴露任意路径缓存失效能力。
 */
async function executeInvalidationPlan(plan: PublicCacheInvalidationPlan) {
  let failed = false;
  async function attempt(operation: () => unknown) {
    try {
      await operation();
    } catch {
      failed = true;
    }
  }
  const references = new Map(
    plan.contents?.map((reference) => [
      `${reference.type}:${reference.id}`,
      reference,
    ]),
  );

  if (plan.refreshPostIndex) {
    await attempt(() =>
      bumpCacheVersion(POST_CACHE_NAMESPACE, POST_CACHE_VERSION_KEY),
    );
  }
  if (plan.refreshPostIndex || plan.refreshLayout) {
    await attempt(() => revalidateTag(BLOG_LIST_CACHE_TAG, { expire: 0 }));
  }
  if (plan.refreshSitemap) {
    await attempt(() => revalidateTag(SITEMAP_CACHE_TAG, { expire: 0 }));
  }
  if (plan.refreshPostDetails) {
    await attempt(() => revalidateTag(POST_DETAILS_CACHE_TAG, { expire: 0 }));
  }
  if (plan.refreshPageDetails) {
    await attempt(() => revalidateTag(PAGE_DETAILS_CACHE_TAG, { expire: 0 }));
  }
  for (const { id, type } of references.values()) {
    const segment = type === "post" ? "archives" : "pages";
    const detailTag =
      type === "post" ? postDetailCacheTag(id) : pageDetailCacheTag(id);
    await attempt(() => revalidateTag(detailTag, { expire: 0 }));
    for (const locale of supportedLanguages) {
      await attempt(() => revalidatePath(`/${locale}/${segment}/${id}`));
    }
  }
  if (plan.refreshLayout) {
    await attempt(() => revalidatePath("/(blog)/[locale]", "layout"));
  }
  if (failed) throw new Error("Public cache invalidation failed");
}

function recordInvalidation(outcome: "completed" | "degraded") {
  const labels = { operation: "invalidate", outcome } as const;
  getMetrics().increment(MetricName.publicCacheInvalidationsTotal, labels);
  if (outcome === "degraded") {
    getLogger().error(LogEvent.cacheInvalidationDegraded, labels);
  }
}

// 调用方在持久化成功后执行失效；缓存失败只返回 degraded，不把已提交写入伪装成失败。
// 重试只重复缓存操作，不重复业务写入；输入契约错误仍在重试前抛出。
async function invalidate(
  input: unknown,
): Promise<PublicCacheInvalidationResult> {
  const plan = PublicCacheInvalidationPlanSchema.parse(input);
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await executeInvalidationPlan(plan);
      recordInvalidation("completed");
      return { state: "completed" };
    } catch {
      if (attempt === 2) {
        recordInvalidation("degraded");
        return { state: "degraded" };
      }
    }
  }
  return { state: "degraded" };
}

/** Next.js 公开缓存失效适配器；只接受共享契约定义的结构化目标。 */
export const publicContentInvalidator = {
  invalidate,
};
