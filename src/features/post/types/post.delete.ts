import type { z } from "zod";
import type { PostDeleteSchema } from "../schema/post.delete.schema";

export type PostDelete = z.output<typeof PostDeleteSchema>;
