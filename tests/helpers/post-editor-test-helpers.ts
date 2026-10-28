import { PostType } from "@/features/post/types/post.type";
import type { PostDetailResult } from "@/features/post/types/post.read-model";

export type PostEditorTestDetail = Pick<
  PostDetailResult,
  "id" | "categoryId" | "coverId" | "type"
> &
  Partial<PostDetailResult>;

/** Only repeated feature-local data; mock ownership and lifecycle remain in each suite. */
export function createPostEditorTestFixture() {
  const postId = "123456789012345678901234";
  const cover = {
    id: "cover-1",
    key: "cover.jpg",
    name: "cover.jpg",
    size: 100,
    type: "image/jpeg",
    url: "/cover.jpg",
    color: null,
    height: 1080,
    width: 1920,
    createdAt: null,
    updatedAt: null,
  };
  const tag = {
    id: "111111111111111111111111",
    name: { zh: "原标签", en: "Original tag" },
    createdAt: null,
    updatedAt: null,
  };
  const originalDetail: PostEditorTestDetail = {
    id: postId,
    version: 0,
    categoryId: "category-1",
    coverId: cover.id,
    cover,
    type: PostType.ARTICLE,
    title: { zh: "原始标题" },
    galleryStyles: [tag],
    movieActors: [tag],
    movieDirectors: [tag],
    movieStyles: [tag],
  };

  return { postId, cover, tag, originalDetail };
}
