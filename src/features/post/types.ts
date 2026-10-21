import type { PaginationInput } from "@/lib/validation/pagination";
import type { z } from "zod";
import type { MediaRecord } from "@/features/media/types";
import type {
  PostWithRelationsSchema,
  PostCategoryRecordSchema,
  PostAuthorRecordSchema,
  PostListResultSchema,
  PublicPostListItemSchema,
  PublicPostListResultSchema,
} from "./post-read-model";

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
export type PostCategoryRecord = z.infer<typeof PostCategoryRecordSchema>;
export type PostAuthorRecord = z.infer<typeof PostAuthorRecordSchema>;
export type PostWithRelations = z.infer<typeof PostWithRelationsSchema>;
export type PostListResult = z.infer<typeof PostListResultSchema>;
export type PublicPostListItem = z.infer<typeof PublicPostListItemSchema>;
export type PublicPostListResult = z.infer<typeof PublicPostListResultSchema>;
export type PostDetailResult = PostWithRelations & {
  imagesInContent: MediaRecord[];
};
