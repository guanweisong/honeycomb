import "server-only";

import { createServerClient } from "@/app/trpc/server";
import {
  isValidListRoute,
  resolveListContext,
} from "@/app/(blog)/[locale]/list/[...slug]/page.utils";
import type { PostListQueryInput } from "@/features/post/types/post.list-query";
import type { PublicPostListResult } from "@/features/post/types/post.read-model";
import { BLOG_LIST_CACHE_TAG } from "@/lib/cache/public-cache-keys";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import type { MultiLangEnum } from "@/lib/i18n/i18n";
import { cacheLife, cacheTag } from "next/cache";
import { dehydrate, QueryClient } from "@tanstack/react-query";

type CachedListPageData =
  | { kind: "not-found" }
  | { kind: "redirect"; href: string }
  | {
      kind: "content";
      locale: MultiLangEnum;
      listResult: PublicPostListResult;
      listHasContent: boolean;
      queryParams: PostListQueryInput;
      siteName?: string | null;
      siteSubName?: string | null;
      type: string;
      typeName: string;
    };

/** Hydrate cached list data with a fresh client-cache timestamp per response. */
export function createListHydrationState(
  queryParams: PostListQueryInput,
  listResult: PublicPostListResult,
) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    ["posts", queryParams],
    { pages: [listResult], pageParams: [null] },
  );
  return dehydrate(queryClient);
}

/** Cache URL-dependent list data so full Link prefetch can include the cards. */
export async function getCachedListPageData(
  localeInput: string,
  slugInput: string[],
): Promise<CachedListPageData> {
  "use cache";
  cacheLife("hours");
  cacheTag(BLOG_LIST_CACHE_TAG);

  if (!isValidListRoute(slugInput)) return { kind: "not-found" };

  const locale = normalizeMultiLangLocale(localeInput);
  const trpc = await createServerClient({
    requestContext: { requestId: "public-list-cache-fill" },
    skipRequestObservability: true,
  });
  const resolution = await resolveListContext(
    { locale, slug: slugInput },
    trpc,
  );
  if (resolution.kind !== "resolved") return resolution;

  const { queryParams, type, typeName } = resolution.context;
  const [setting, result] = await Promise.all([
    trpc.setting.index(),
    trpc.post.index({ ...queryParams, cursor: null }),
  ]);
  return {
    kind: "content",
    locale,
    listResult: result,
    listHasContent: result.list.length > 0 || Boolean(result.nextCursor),
    queryParams,
    siteName: setting?.siteName?.[locale],
    siteSubName: setting?.siteSubName?.[locale],
    type,
    typeName,
  };
}
