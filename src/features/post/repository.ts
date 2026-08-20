import type { MultiLang } from "@/packages/domain/localization/multi-lang";
export type PostCommandInput = Partial<{
  title: unknown; content: unknown; excerpt: unknown; status: string; type: string;
  categoryId: string; coverId: string | null; commentStatus: string; quoteAuthor: unknown;
  quoteContent: unknown; movieTime: string | null; galleryLocation: unknown; galleryTime: string | null;
}>;
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
export interface PostTagRecord { id: string; name: MultiLang | null; createdAt: string | null; updatedAt: string | null }
export interface PostCategoryRecord { id: string; title: MultiLang | null; description: MultiLang | null; parent: string | null; status: string; path: string; createdAt: string | null; updatedAt: string | null }
export interface PostAuthorRecord { id: string; email: string | null; level: string; name: string | null; status: string; createdAt: string | null; updatedAt: string | null }
export interface PostWithRelations {
  id: string; commentStatus: string; galleryLocation: MultiLang | null; galleryTime: string | null;
  movieTime: string | null; authorId: string; categoryId: string; content: MultiLang | null;
  coverId: string | null; excerpt: MultiLang | null; status: string; title: MultiLang | null;
  type: string; views: number | null; quoteAuthor: MultiLang | null; quoteContent: MultiLang | null;
  createdAt: string | null; updatedAt: string | null;
  category?: PostCategoryRecord | null; author?: PostAuthorRecord | null; cover?: PostMediaRecord | null;
  movieActors: PostTagRecord[]; movieDirectors: PostTagRecord[]; movieStyles: PostTagRecord[]; galleryStyles: PostTagRecord[];
}
export interface PostQueryRepository {
  list(input: PostListInput, visibility: PostVisibility): Promise<{ list: PostWithRelations[]; total: number }>;
  detail(id: string, visibility: PostVisibility): Promise<(PostWithRelations & { imagesInContent: PostMediaRecord[] }) | null>;
  categoryFilter(categoryId: string): Promise<string[]>;
}
export type { PostCommandRepository } from "./infrastructure/post-command-repository";
export interface PostSpecialRepository {
  cachedList(input: PostListInput): Promise<{ list: PostWithRelations[]; total: number }>;
  randomByCategory(categoryId: string): Promise<Array<{ id: string; title: MultiLang | null; quoteContent: MultiLang | null }>>;
  publishedCategoryId(id: string): Promise<{ categoryId?: string } | undefined>;
}
