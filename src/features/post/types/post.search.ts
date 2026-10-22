import type { z } from "zod";
import type { PostType } from "./post.type";
import type { PostSearchInputSchema } from "../schemas/post.search.schema";

export type PostSearchInput = z.infer<typeof PostSearchInputSchema>;

/** Minimal public search projection; never includes raw HTML or admin fields. */
export interface PostSearchResult {
  id: string;
  title: string;
  excerpt: string;
  type: PostType;
  cover: { url: string } | null;
}
