import type { z } from "zod";
import type {
  PostFieldsSchema,
  PostRelationPatchSchema,
} from "../schema/post.fields.schema";
import type { PostInsertSchema } from "../schema/post.insert.schema";

export type PostFields = z.output<typeof PostFieldsSchema>;

export type PostRelationPatch = z.output<typeof PostRelationPatchSchema>;

export type PostInsert = z.output<typeof PostInsertSchema>;
