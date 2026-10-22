import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";
import { EnableStatus } from "@/lib/validation/enable-status";
import type { PostWithRelations } from "@/features/post/types/post.read-model";
import type { post } from "@/lib/db/schema";

type PostFixture = PostWithRelations & typeof post.$inferSelect;

export function createPostFixture(
  overrides: Partial<PostFixture> = {},
): PostFixture {
  return {
    id: "post-1",
    authorId: "author-1",
    categoryId: "category-1",
    title: null,
    content: null,
    excerpt: null,
    coverId: null,
    status: PostStatus.PUBLISHED,
    type: PostType.ARTICLE,
    commentStatus: EnableStatus.ENABLE,
    galleryLocation: null,
    galleryTime: null,
    movieTime: null,
    quoteAuthor: null,
    quoteContent: null,
    views: 0,
    version: 0,
    creationToken: null,
    creationInputHash: null,
    createdAt: null,
    updatedAt: null,
    movieActors: [],
    movieDirectors: [],
    movieStyles: [],
    galleryStyles: [],
    ...overrides,
  };
}
