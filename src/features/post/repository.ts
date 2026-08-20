/* eslint-disable @typescript-eslint/no-explicit-any -- 关系读模型由 infrastructure 组装。 */
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
/** 文章查询读模型由 infrastructure 组装，application 不感知数据库表关系。 */
export type PostWithRelations = any;
export interface PostQueryRepository {
  list(input: PostListInput, visibility: PostVisibility): Promise<{ list: PostWithRelations[]; total: number }>;
  detail(id: string, visibility: PostVisibility): Promise<(PostWithRelations & { imagesInContent: any[] }) | null>;
  categoryFilter(categoryId: string): Promise<string[]>;
}
export type { PostCommandRepository } from "./infrastructure/post-command-repository";
export interface PostSpecialRepository {
  cachedList(input: PostListInput): Promise<{ list: PostWithRelations[]; total: number }>;
  randomByCategory(categoryId: string): Promise<Array<{ id: string; title: any; quoteContent: any }>>;
  publishedCategoryId(id: string): Promise<{ categoryId?: string } | undefined>;
}
