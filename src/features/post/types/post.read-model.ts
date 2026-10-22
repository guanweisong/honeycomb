import type { z } from "zod";
import type { MediaRecord } from "@/features/media/types/media.record";
import type {
  PostCategoryRecordSchema,
  PostAuthorRecordSchema,
  PostWithRelationsSchema,
  AdminPostListItemSchema,
  AdminPostListResultSchema,
  PostListResultSchema,
  PublicPostListItemSchema,
  PublicPostListResultSchema,
} from "../schema/post.read-model.schema";

export type PostCategoryRecord = z.infer<typeof PostCategoryRecordSchema>;

export type PostAuthorRecord = z.infer<typeof PostAuthorRecordSchema>;

export type PostWithRelations = z.infer<typeof PostWithRelationsSchema>;

export type AdminPostListItem = z.infer<typeof AdminPostListItemSchema>;

export type AdminPostListResult = z.infer<typeof AdminPostListResultSchema>;

export type PostListResult = z.infer<typeof PostListResultSchema>;

export type PublicPostListItem = z.infer<typeof PublicPostListItemSchema>;

export type PublicPostListResult = z.infer<typeof PublicPostListResultSchema>;

export type PostDetailResult = PostWithRelations & {
  imagesInContent: MediaRecord[];
};
