"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaRecord as MediaViewModel } from "@/features/media/types";
import type { MediaIndexInput } from "@/features/media/types";
import { trpc } from "@/lib/trpc/client/trpc";

const MEDIA_PAGE_SIZE = 50;

export function getMediaQueryInput(page = 1): MediaIndexInput {
  return { page, limit: MEDIA_PAGE_SIZE };
}

export function useMediaQuery() {
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState<Partial<Record<number, MediaViewModel[]>>>(
    {},
  );
  const [total, setTotal] = useState(0);
  const requestedPage = useRef<number | undefined>(undefined);
  const refreshFirstPage = useRef(false);
  const searchParams = getMediaQueryInput(page);
  const query = trpc.media.index.useQuery(searchParams);
  const { refetch } = query;

  useEffect(() => {
    if (page === 1 && refreshFirstPage.current) {
      refreshFirstPage.current = false;
      void refetch();
    }
  }, [page, refetch]);

  useEffect(() => {
    if (!query.data || query.isPlaceholderData) return;

    setPages((currentPages) => {
      const currentPage = currentPages[page];
      const nextPage = query.data.list;
      if (currentPage === nextPage) {
        return currentPages;
      }
      return { ...currentPages, [page]: query.data.list };
    });
    setTotal(query.data.total);
    if (requestedPage.current === page) {
      requestedPage.current = undefined;
    }
  }, [page, query.data, query.isPlaceholderData]);

  const list = useMemo(() => {
    const seen = new Set<string>();
    return Object.keys(pages)
      .map(Number)
      .sort((left, right) => left - right)
      .flatMap((pageNumber) => pages[pageNumber] ?? [])
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
  }, [pages]);
  const currentPageLoaded = pages[page] !== undefined;

  const loadMore = useCallback(() => {
    if (
      query.isFetching ||
      requestedPage.current !== undefined ||
      !currentPageLoaded ||
      !query.data ||
      list.length >= total ||
      query.data.list.length === 0
    ) {
      return;
    }

    const nextPage = page + 1;
    requestedPage.current = nextPage;
    setPage(nextPage);
  }, [
    currentPageLoaded,
    list.length,
    page,
    query.data,
    query.isFetching,
    total,
  ]);

  // Retry the current failed page, not the first page or the next page.
  const retry = useCallback(() => {
    if (!query.isFetching) void refetch({ cancelRefetch: false });
  }, [query.isFetching, refetch]);

  const reset = useCallback(() => {
    requestedPage.current = undefined;
    if (page === 1) {
      // 保留已有页：结构共享可能让成功 refetch 的 data 引用不变。
      void refetch();
    } else {
      setPages((currentPages) =>
        currentPages[1] ? { 1: currentPages[1] } : {},
      );
      refreshFirstPage.current = true;
      setPage(1);
    }
  }, [page, refetch]);

  const hasMore =
    currentPageLoaded &&
    list.length < (query.data?.total ?? total) &&
    (query.data?.list.length ?? 0) > 0;

  return {
    isLoading: query.isLoading,
    error: query.error?.message,
    data: {
      list,
      total: query.data?.total ?? total,
    },
    hasMore,
    // Keep the load-more state active until the response is reconciled into
    // `pages`; otherwise `hasMore` briefly becomes false between query settle
    // and the page reconciliation effect updating the current page.
    isFetchingMore:
      page > 1 && (query.isFetching || (!currentPageLoaded && !query.error)),
    loadMore,
    retry,
    isRetrying: query.isFetching,
    refetch: reset,
    reset,
  };
}
/**
 * 媒体管理查询 Hook，负责媒体分页查询和页码参数。
 */
