import type { z } from "zod";
import type { PostUpdateSchema } from "../schema/post.update.schema";

export type PostUpdate = z.output<typeof PostUpdateSchema>;
