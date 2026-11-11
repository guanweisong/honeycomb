import { useInfiniteQuery } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc/client/trpc";
import type {
  PostListQueryInput,
  PublicPostCursor,
} from "@/features/post/types/post.list-query";

/**
 * 用于无限滚动加载文章列表的 React Query Hook。
 * @param {PostListQueryInput} queryParams - 查询参数。
 * @returns 无限查询结果。
 */
export default function useInfiniteQueryPostList(
  queryParams: PostListQueryInput,
) {
  return useInfiniteQuery({
    queryKey: ["posts", queryParams],
    queryFn: ({ pageParam }: { pageParam: PublicPostCursor | null }) =>
      trpcClient.post.index.query({ ...queryParams, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
