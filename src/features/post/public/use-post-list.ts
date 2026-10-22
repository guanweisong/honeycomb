import { useInfiniteQuery } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc/client/trpc";
import type { PostListQueryInput } from "@/features/post/types";
import type { PublicPostListResult } from "@/features/post/types";

/**
 * 获取文章列表的异步函数。
 * @param {PostListQueryInput} queryParams - 查询参数。
 * @param {number} [page=1] - 页码。
 * @returns {Promise<PublicPostListResult>} 文章列表数据。
 */
const getPostList = async (
  queryParams: PostListQueryInput,
  page: number = 1,
) => {
  const params = { ...queryParams, page };
  return await trpcClient.post.index.query(params);
};

/**
 * 用于无限滚动加载文章列表的 React Query Hook。
 * @param {PostListQueryInput} queryParams - 查询参数。
 * @param initialData
 * @returns {UseInfiniteQueryResult<PublicPostListResult, Error>} 无限查询结果。
 */
export default function useInfiniteQueryPostList(
  queryParams: PostListQueryInput,
  initialData?: PublicPostListResult,
) {
  return useInfiniteQuery<PublicPostListResult, Error>({
    queryKey: ["posts", queryParams],
    queryFn: ({ pageParam }) =>
      getPostList(queryParams, typeof pageParam === "number" ? pageParam : 1),
    getNextPageParam: (lastPage, allPages) => {
      const { total } = lastPage;
      const loadedCount = allPages.reduce(
        (count, page) => count + page.list.length,
        0,
      );

      if (lastPage.list.length === 0 || loadedCount >= total) {
        return undefined;
      }
      return allPages.length + 1;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: initialData
      ? { pages: [initialData], pageParams: [1] }
      : undefined,
  });
}
