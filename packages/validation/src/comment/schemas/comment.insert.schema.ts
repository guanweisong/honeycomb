import { createInsertSchema } from "drizzle-zod";
import { comment } from "@honeycomb/db/src/schema";

export const CommentInsertSchema = createInsertSchema(comment).pick({
  author: true,
  content: true,
  email: true,
  site: true,
  parentId: true,
  postId: true,
  pageId: true,
});
