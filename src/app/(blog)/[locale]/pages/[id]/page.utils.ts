import { notFound } from "next/navigation";
import { PostStatus } from "@/packages/trpc/api/modules/post/types/post.status";

type PostDetailLike = {
  status?: PostStatus | string | null;
} | null | undefined;

export function assertPublishedPost(postDetail: PostDetailLike) {
  if (!postDetail || postDetail.status !== PostStatus.PUBLISHED) {
    notFound();
  }

  return postDetail;
}
