"use client";

import { useCallback, useMemo } from "react";
import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { MediaIndexInput } from "@/features/media/types/media.list";
import { useCurrentUser } from "@/app/admin/(dashboard)/providers/use-current-user";
import { trpcClient } from "@/lib/trpc/client/trpc";

const MEDIA_PAGE_SIZE = 50;
type MediaPage = Awaited<ReturnType<typeof trpcClient.media.index.query>>;

export function getMediaQueryInput(page = 1): MediaIndexInput {
  return { page, limit: MEDIA_PAGE_SIZE };
}

function visibleMedia(pages: MediaPage[]) {
  const seen = new Set<string>();
  return pages
    .flatMap(({ list }) => list)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

/** 媒体分页由查询缓存统一管理；变更后只保留并刷新第一页。 */
export function useMediaQuery() {
  const { user } = useCurrentUser();
  const client = useQueryClient();
  const queryKey = useMemo(
    () => ["media", user?.id, { limit: MEDIA_PAGE_SIZE }],
    [user?.id],
  );
  const query = useInfiniteQuery({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: ({ pageParam, signal }) =>
      trpcClient.media.index.query(getMediaQueryInput(pageParam), { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages, lastPageParam) =>
      lastPage.list.length > 0 && visibleMedia(pages).length < lastPage.total
        ? lastPageParam + 1
        : undefined,
  });
  const { fetchNextPage, refetch, hasNextPage, isFetchNextPageError } = query;
  const list = useMemo(
    () => visibleMedia(query.data?.pages ?? []),
    [query.data],
  );

  const loadMore = useCallback(() => {
    // 哨兵可能保留旧 render 的回调，读取缓存中的即时状态而非维护第二把锁。
    const state = client.getQueryState(queryKey);
    if (
      !hasNextPage ||
      state?.status !== "success" ||
      state.fetchStatus !== "idle"
    ) {
      return;
    }
    void fetchNextPage({ cancelRefetch: false });
  }, [client, queryKey, hasNextPage, fetchNextPage]);

  const retry = useCallback(() => {
    if (!user?.id) return;
    // 下一页失败只重试该页；已有页的后台刷新使用原生聚合 refetch。
    void (isFetchNextPageError ? fetchNextPage : refetch)({
      cancelRefetch: false,
    });
  }, [user?.id, isFetchNextPageError, fetchNextPage, refetch]);

  const reset = useCallback(() => {
    if (!user?.id) return;
    client.setQueryData<InfiniteData<MediaPage, number>>(queryKey, (data) =>
      data
        ? {
            pages: data.pages.slice(0, 1),
            pageParams: data.pageParams.slice(0, 1),
          }
        : data,
    );
    // 同步替换进行中的请求，保留首屏行；旧请求不能恢复已丢弃的后续页。
    void refetch({ cancelRefetch: true });
  }, [client, queryKey, refetch, user?.id]);

  return {
    isLoading: query.isLoading,
    error: query.error?.message,
    data: { list, total: query.data?.pages.at(-1)?.total ?? 0 },
    hasMore: hasNextPage && !query.isFetchingNextPage && !query.isError,
    isFetchingMore: query.isFetchingNextPage,
    loadMore,
    retry,
    isRetrying: query.isFetching,
    refetch: reset,
    reset,
  };
}
