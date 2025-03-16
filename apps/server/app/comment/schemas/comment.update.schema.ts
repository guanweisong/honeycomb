import { CommentCreateSchema } from "@/app/comment/schemas/commnet.create.schema";

export const CommentUpdateSchema = CommentCreateSchema.partial();
