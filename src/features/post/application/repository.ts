import type { PaginationInput } from "@/packages/application/pagination";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";
import type { NullableLocalizedInput } from "@/packages/domain/localization/i18n";
import type { z } from "zod";
import type { MediaRecord, TagRecord } from "@/features/contracts";
import type {
  PostWithRelationsSchema,
  PostCategoryRecordSchema,
  PostAuthorRecordSchema,
  PostListResultSchema,
} from "./post-read-model";
import type { PostStatus } from "@/packages/domain/content/post-status";

export type PostI18nInput = NullableLocalizedInput;
export type PostCreateCommand = import("zod").output<
  typeof import("./write-schema").PostInsertSchema
>;
export type PostUpdateCommand = Partial<PostCreateCommand> & { id: string };
export type PostVisibility = "PUBLISHED_ONLY" | "ALL";
export type PostListInput = PaginationInput & {
  status?: string[];
  type?: string[];
  categoryId?: string;
  tagId?: string;
  authorId?: string;
  title?: string;
  content?: string;
};
export type PostMediaRecord = MediaRecord;
export type PostTagRecord = TagRecord;
export type PostCategoryRecord = z.infer<typeof PostCategoryRecordSchema>;
export type PostAuthorRecord = z.infer<typeof PostAuthorRecordSchema>;
export type PostWithRelations = z.infer<typeof PostWithRelationsSchema>;
export type PostListResult = z.infer<typeof PostListResultSchema>;
export type PostDetailResult = PostWithRelations & {
  imagesInContent: PostMediaRecord[];
};
export interface PostQueryRepository {
  list(
    input: PostListInput,
    visibility: PostVisibility,
  ): Promise<PostListResult>;
  detail(
    id: string,
    visibility: PostVisibility,
  ): Promise<PostDetailResult | null>;
  categoryFilter(categoryId: string): Promise<string[]>;
}
import type { TagType } from "@/packages/domain/content/tag";
export interface PostCommandRepository {
  create(input: PostCreateCommand, authorId: string): Promise<{ id: string }>;
  destroy(ids: string[]): Promise<{ success: true }>;
  findStatus(id: string): Promise<PostStatus | null>;
  update(input: PostUpdateCommand): Promise<{ id: string }>;
  updateTags(input: {
    postId: string;
    tagIds: string[];
    type: TagType;
  }): Promise<{ success: true }>;
  incrementViews(id: string): Promise<{ views: number | null } | undefined>;
}
export interface PostSpecialRepository {
  cachedList(input: PostListInput): Promise<PostListResult>;
  randomByCategory(categoryId: string): Promise<
    Array<{
      id: string;
      title: MultiLang | null;
      quoteContent: MultiLang | null;
    }>
  >;
  publishedCategoryId(id: string): Promise<{ categoryId?: string } | undefined>;
}
