import { PostCreateSchema } from "@/app/post/schemas/post.create.schema";

export const PostUpdateSchema = PostCreateSchema.partial();
