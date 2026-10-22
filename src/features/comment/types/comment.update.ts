import type { z } from "zod";
import type { CommentUpdateSchema } from "../schemas/comment.update.schema";

export type CommentUpdate = z.output<typeof CommentUpdateSchema>;
