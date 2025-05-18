import useSWRInfinite from "swr/infinite";
import PostServer from "@/services/post";
import { PostListQuery } from "@/types/post/post.list.query";
import { PostEntity } from "@/types/post/post.entity";

const useQueryPostList = (params: PostListQuery, initData: PostEntity[]) => {
  const { data, error, mutate, size, setSize } = useSWRInfinite(
    (index) => ["/posts", { ...params, page: index + 1 }],
    ([_url, props]) => PostServer.indexPostList(props as PostListQuery),
    { fallbackData: [initData], revalidateAll: true },
  );

  return {
    data: data!,
    error,
    mutate,
    size,
    setSize,
  };
};

export default useQueryPostList;
