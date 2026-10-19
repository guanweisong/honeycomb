import { z } from "zod";
import type { PostType } from "@/packages/domain/content/post";

export const PostSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(100),
  locale: z.enum(["zh", "en"]),
});

export type PostSearchInput = z.infer<typeof PostSearchInputSchema>;

/** Minimal public search projection; never includes raw HTML or admin fields. */
export interface PostSearchResult {
  id: string;
  title: string;
  excerpt: string;
  type: PostType;
  cover: { url: string } | null;
}
