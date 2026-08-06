"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MediaEntity } from "@/packages/trpc/api/modules/media/types/media.entity";
import type { MediaIndexInput } from "@/packages/trpc/api/modules/media/schemas/media.list.query.schema";
import { trpc } from "@/packages/trpc/client/trpc";

export const MEDIA_PAGE_SIZE = 50;

function getPageSignature(page: MediaEntity[]) {
  return page.map((item) => item?.id ?? String(item)).join("|");
}

export function getMediaQueryInput(page = 1): MediaIndexInput {
  return { page, limit: MEDIA_PAGE_SIZE };
}

export function useMediaQuery() {
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState<Record<number, MediaEntity[]>>({});
  const [total, setTotal] = useState(0);
  const requestedPage = useRef<number | undefined>(undefined);
  const requestedFromSignature = useRef<string | undefined>(undefined);
  const searchParams = getMediaQueryInput(page);
  const query = trpc.media.index.useQuery(searchParams);

  useEffect(() => {
    if (!query.data) return;

    if (
      requestedPage.current === page &&
      requestedFromSignature.current === getPageSignature(query.data.list)
    ) {
      return;
    }

    setPages((currentPages) => {
      const currentPage = currentPages[page];
      const nextPage = query.data.list;
      if (
        currentPage?.length === nextPage.length &&
        currentPage.every((item, index) => item.id === nextPage[index]?.id)
      ) {
        return currentPages;
      }
      return { ...currentPages, [page]: query.data.list };
    });
    setTotal(query.data.total);
    if (requestedPage.current === page) {
      requestedPage.current = undefined;
      requestedFromSignature.current = undefined;
    }
  }, [page, query.data]);

  const list = useMemo(
    () =>
      Object.keys(pages)
        .map(Number)
        .sort((left, right) => left - right)
        .flatMap((pageNumber) => pages[pageNumber] ?? []),
    [pages],
  );
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
    requestedFromSignature.current = getPageSignature(query.data.list);
    setPage(nextPage);
  }, [currentPageLoaded, list.length, page, query.data, query.isFetching, total]);

  const reset = useCallback(() => {
    requestedPage.current = undefined;
    requestedFromSignature.current = undefined;
    setPages({});
    setTotal(0);

    if (page === 1) {
      void query.refetch();
    } else {
      setPage(1);
    }
  }, [page, query.refetch]);

  const hasMore =
    currentPageLoaded &&
    list.length < (query.data?.total ?? total) &&
    (query.data?.list.length ?? 0) > 0;

  return {
    data: {
      list,
      total: query.data?.total ?? total,
    },
    hasMore,
    isFetchingMore: page > 1 && query.isFetching,
    loadMore,
    refetch: reset,
    reset,
  };
}
