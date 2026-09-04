import { notFound } from "next/navigation";
import { PostStatus } from "@/packages/domain/content/post-status";

type PostDetailLike =
  | {
      status?: PostStatus | string | null;
    }
  | null
  | undefined;

export function assertPublishedPost<T extends NonNullable<PostDetailLike>>(
  postDetail: T | null | undefined,
): T {
  if (!postDetail || postDetail.status !== PostStatus.PUBLISHED) {
    notFound();
  }

  return postDetail;
}
