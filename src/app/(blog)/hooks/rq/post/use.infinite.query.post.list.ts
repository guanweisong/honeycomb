import { useInfiniteQuery } from "@tanstack/react-query";
import { trpcClient } from "@/packages/trpc/client/trpc";
import { PostListItemEntity } from "@/packages/trpc/server/types/post.entity";
import { PostListQueryInput } from "@/packages/validation/schemas/post/post.list.query.schema";

/**
 * 文章列表查询结果的输出类型。
 */
type PostIndexOutput = {
  /**
   * 文章实体列表。
   */
  list: PostListItemEntity[];
  /**
   * 文章总数。
   */
  total: number;
};

/**
 * 获取文章列表的异步函数。
 * @param {PostListQueryInput} queryParams - 查询参数。
 * @param {number} [page=1] - 页码。
 * @returns {Promise<PostIndexOutput>} 文章列表数据。
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
 * @returns {UseInfiniteQueryResult<PostIndexOutput, Error>} 无限查询结果。
 */
export default function useInfiniteQueryPostList(
  queryParams: PostListQueryInput,
  initialData?: PostIndexOutput,
) {
  return useInfiniteQuery<PostIndexOutput, Error>({
    queryKey: ["posts", queryParams],
    // @ts-ignore
    queryFn: ({ pageParam = 1 }) =>
      getPostList(queryParams, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      const { list, total } = lastPage;
      const loadedCount = allPages.flatMap((page) => page.list).length;

      if (loadedCount >= total) {
        return undefined;
      }
      return allPages.length + 1;
    },
    initialPageParam: 1,
    initialData: initialData
      ? { pages: [initialData], pageParams: [1] }
      : undefined,
  });
}
