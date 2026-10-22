import type { z } from "zod";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { PostListQuerySchema } from "../schemas/post.list-query.schema";

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

export type PostListQueryInput = z.output<typeof PostListQuerySchema>;
