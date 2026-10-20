import { z } from "zod";
import { PostInsertSchema } from "@/features/post/schema";

// Drafts are incomplete input, not persisted records. Strip IDs, status and relations.
const PostDraftSchema = PostInsertSchema.omit({ status: true })
  .partial()
  .extend({
    categoryId: z.string().optional(),
  });
export type PostDraft = z.infer<typeof PostDraftSchema>;
export function parsePostDraft(value: unknown): PostDraft | null {
  const result = PostDraftSchema.safeParse(value);
  return result.success ? result.data : null;
}
