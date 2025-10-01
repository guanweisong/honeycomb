import { useInfiniteQuery } from "@tanstack/react-query";
import { trpcClient } from "@honeycomb/trpc/client/trpc";
import { PostEntity } from "@honeycomb/validation/post/schemas/post.entity.schema";
import { PostListQueryInput } from "@honeycomb/validation/post/schemas/post.list.query.schema";

type PostIndexOutput = {
  list: PostEntity[];
  total: number;
};

const getPostList = async (
  queryParams: PostListQueryInput,
  page: number = 1,
) => {
  const params = { ...queryParams, page };
  return await trpcClient.post.index.query(params);
};

export default function useInfiniteQueryPostList(
  queryParams: PostListQueryInput,
) {
  return useInfiniteQuery<PostIndexOutput, Error>({
    queryKey: ["posts", queryParams],
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
  });
}
