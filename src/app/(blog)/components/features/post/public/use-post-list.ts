import { useInfiniteQuery } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc/client/trpc";
import type {
  PostListQueryInput,
  PublicPostCursor,
} from "@/features/post/types/post.list-query";
import type { PublicPostListResult } from "@/features/post/types/post.read-model";

/**
 * 用于无限滚动加载文章列表的 React Query Hook。
 * @param {PostListQueryInput} queryParams - 查询参数。
 * @param initialData
 * @returns {UseInfiniteQueryResult<PublicPostListResult, Error>} 无限查询结果。
 */
export default function useInfiniteQueryPostList(
  queryParams: PostListQueryInput,
  initialData?: PublicPostListResult,
  snapshotVersion?: string,
) {
  return useInfiniteQuery({
    queryKey: ["posts", queryParams, snapshotVersion],
    queryFn: ({ pageParam }: { pageParam: PublicPostCursor | null }) =>
      trpcClient.post.index.query({ ...queryParams, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: initialData
      ? { pages: [initialData], pageParams: [null] }
      : undefined,
  });
}
