import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { supportedLanguages } from "@/packages/domain/localization/i18n";
import {
  PublicCacheInvalidationPlanSchema,
  type PublicCacheInvalidationPlan,
  type PublicCacheInvalidationResult,
} from "@/packages/application/public-content-invalidator";
import { bumpCacheVersion } from "@/packages/infrastructure/cache/upstash-cache";
import {
  getPageDetailCacheTag,
  getPostDetailCacheTag,
  POST_INDEX_CACHE_TAG,
  PUBLIC_LAYOUT_CACHE_TAG,
  POST_CACHE_NAMESPACE,
  POST_CACHE_VERSION_KEY,
  SITEMAP_CACHE_TAG,
} from "@/packages/infrastructure/cache/public-cache-keys";
import {
  getLogger,
  getMetrics,
} from "@/packages/infrastructure/observability/server";
import {
  LogEvent,
  MetricName,
} from "@/packages/infrastructure/observability/core/names";

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
    await attempt(() => revalidateTag(POST_INDEX_CACHE_TAG, { expire: 0 }));
  }
  if (plan.refreshSitemap) {
    await attempt(() => revalidateTag(SITEMAP_CACHE_TAG, { expire: 0 }));
  }
  for (const { id, type } of references.values()) {
    await attempt(() =>
      revalidateTag(
        type === "post" ? getPostDetailCacheTag(id) : getPageDetailCacheTag(id),
        { expire: 0 },
      ),
    );
    const segment = type === "post" ? "archives" : "pages";
    for (const locale of supportedLanguages) {
      await attempt(() => revalidatePath(`/${locale}/${segment}/${id}`));
    }
  }
  if (plan.refreshLayout) {
    await attempt(() => revalidateTag(PUBLIC_LAYOUT_CACHE_TAG, { expire: 0 }));
    await attempt(() => revalidatePath("/[locale]", "layout"));
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

async function invalidate(input: unknown): Promise<PublicCacheInvalidationResult> {
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

/** Next.js 公开缓存失效适配器；只接受 Application 定义的结构化目标。 */
export const publicContentInvalidator = {
  invalidate,
};
