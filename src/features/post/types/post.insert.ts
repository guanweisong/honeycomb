import type { z } from "zod";
import type {
  PostFieldsSchema,
  PostRelationPatchSchema,
} from "@/features/post/schemas/post.fields.schema";
import type { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";

export type PostFields = z.output<typeof PostFieldsSchema>;

export type PostRelationPatch = z.output<typeof PostRelationPatchSchema>;

export type PostInsert = z.output<typeof PostInsertSchema>;
