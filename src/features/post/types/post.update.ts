import type { z } from "zod";
import type { PostUpdateSchema } from "../schemas/post.update.schema";

export type PostUpdate = z.output<typeof PostUpdateSchema>;
