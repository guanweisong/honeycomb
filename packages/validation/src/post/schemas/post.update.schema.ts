import { PostCreateSchema } from "./post.create.schema";

export const PostUpdateSchema = PostCreateSchema.partial();
