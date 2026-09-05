import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import type { PostWithRelations } from "@/features/post/application/repository";
import type { post } from "@/packages/infrastructure/db/schema";

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
    createdAt: null,
    updatedAt: null,
    movieActors: [],
    movieDirectors: [],
    movieStyles: [],
    galleryStyles: [],
    ...overrides,
  };
}
