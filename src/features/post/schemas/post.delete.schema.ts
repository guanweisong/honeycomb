import { z } from "zod";
import { IdSchema } from "@/lib/validation/id.schema";
import { MAX_BATCH_SIZE } from "@/lib/validation/resource-limits";
import { PostVersionSchema } from "./post.fields.schema";

export const PostDeleteSchema = z.strictObject({
  items: z
    .array(z.strictObject({ id: IdSchema, expectedVersion: PostVersionSchema }))
    .min(1)
    .max(MAX_BATCH_SIZE)
    .refine(
      (items) => new Set(items.map(({ id }) => id)).size === items.length,
      "文章不能重复",
    ),
});
