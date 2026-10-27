import { z } from "zod";
import {
  PostFieldsSchema,
  PostRelationPatchSchema,
} from "@/features/post/schemas/post.fields.schema";

export const PostInsertSchema = PostFieldsSchema.extend(
  PostRelationPatchSchema.shape,
)
  .extend({
    creationToken: z.uuid(),
  })
  .strict();

export const PostCreationResultInputSchema = z.object({
  creationToken: z.uuid(),
});
