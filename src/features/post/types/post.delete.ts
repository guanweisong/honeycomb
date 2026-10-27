import type { z } from "zod";
import type { PostDeleteSchema } from "@/features/post/schemas/post.delete.schema";

export type PostDelete = z.output<typeof PostDeleteSchema>;
