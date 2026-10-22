import type { z } from "zod";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { PostListQuerySchema } from "../schemas/post.list-query.schema";

export type PostVisibility = "PUBLISHED_ONLY" | "ALL";

// Repository options omit explicit undefined even with exact optional types.
export type PostListInput = PaginationInput & {
  [Key in keyof Omit<PostListQueryInput, keyof PaginationInput>]: Exclude<
    PostListQueryInput[Key],
    undefined
  >;
};

export type PostListQueryInput = z.output<typeof PostListQuerySchema>;
