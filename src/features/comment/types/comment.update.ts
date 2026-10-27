import type { z } from "zod";
import type { CommentUpdateSchema } from "@/features/comment/schemas/comment.update.schema";

export type CommentUpdate = z.output<typeof CommentUpdateSchema>;
