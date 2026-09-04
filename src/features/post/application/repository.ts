import type { MultiLang } from "@/packages/domain/localization/multi-lang";
import type { I18n } from "@/packages/domain/localization/i18n";
import type { PostStatus } from "@/packages/domain/content/post-status";
import type { PostType } from "@/packages/domain/content/post";
import type { EnableStatus } from "@/packages/domain/shared/enable-status";

export type PostI18nInput = { en?: string | null; zh?: string | null } | null;
export interface PostCreateCommand {
  categoryId: string;
  title?: PostI18nInput;
  content?: PostI18nInput;
  excerpt?: PostI18nInput;
  status?: PostStatus;
  type?: PostType;
  coverId?: string | null;
  commentStatus?: EnableStatus;
  quoteAuthor?: PostI18nInput;
  quoteContent?: PostI18nInput;
  movieTime?: string | null;
  galleryLocation?: PostI18nInput;
  galleryTime?: string | null;
}
export type PostUpdateCommand = Partial<PostCreateCommand> & { id: string };
export type PostVisibility = "PUBLISHED_ONLY" | "ALL";
export type PostListInput = Record<string, string | number | boolean | Array<string | number | boolean> | undefined> & {
  page?: number; limit?: number; sortField?: string; sortOrder?: string;
  categoryId?: string; tagId?: string; authorId?: string; title?: string; content?: string;
};
export interface PostMediaRecord {
  id: string; key: string; name: string; size: number; type: string; url: string;
  color: string | null; height: number | null; width: number | null;
  createdAt: string | null; updatedAt: string | null;
}
export interface PostTagRecord { id: string; name: I18n | null; createdAt: string | null; updatedAt: string | null }
export interface PostCategoryRecord { id: string; title: MultiLang | null; description: MultiLang | null; parent: string | null; status: string; path: string; createdAt: string | null; updatedAt: string | null }
export interface PostAuthorRecord { id: string; email: string | null; level: string; name: string | null; status: string; createdAt: string | null; updatedAt: string | null }
export interface PostWithRelations {
  id: string; commentStatus: EnableStatus; galleryLocation: MultiLang | null; galleryTime: string | null;
  movieTime: string | null; authorId: string; categoryId: string; content: MultiLang | null;
  coverId: string | null; excerpt: MultiLang | null; status: PostStatus; title: MultiLang | null;
  type: PostType; views: number | null; quoteAuthor: MultiLang | null; quoteContent: MultiLang | null;
  createdAt: string | null; updatedAt: string | null;
  category?: PostCategoryRecord | null; author?: PostAuthorRecord | null; cover?: PostMediaRecord | null;
  movieActors: PostTagRecord[]; movieDirectors: PostTagRecord[]; movieStyles: PostTagRecord[]; galleryStyles: PostTagRecord[];
}
export interface PostQueryRepository {
  list(input: PostListInput, visibility: PostVisibility): Promise<{ list: PostWithRelations[]; total: number }>;
  detail(id: string, visibility: PostVisibility): Promise<(PostWithRelations & { imagesInContent: PostMediaRecord[] }) | null>;
  categoryFilter(categoryId: string): Promise<string[]>;
}
import type { TagType } from "@/packages/domain/content/tag";
export interface PostCommandRepository {
  create(input: PostCreateCommand, authorId: string): Promise<{ id: string }>;
  destroy(ids: string[]): Promise<{ success: true }>;
  findStatus(id: string): Promise<PostStatus | null>;
  update(input: PostUpdateCommand): Promise<{ id: string }>;
  updateTags(input: { postId: string; tagIds: string[]; type: TagType }): Promise<{ success: true }>;
  incrementViews(id: string): Promise<{ views: number | null } | undefined>;
}
export interface PostSpecialRepository {
  cachedList(input: PostListInput): Promise<{ list: PostWithRelations[]; total: number }>;
  randomByCategory(categoryId: string): Promise<Array<{ id: string; title: MultiLang | null; quoteContent: MultiLang | null }>>;
  publishedCategoryId(id: string): Promise<{ categoryId?: string } | undefined>;
}
