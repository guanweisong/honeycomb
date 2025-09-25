import { createInsertSchema } from "drizzle-zod";
import { post } from "@honeycomb/db/src/schema";

export const PostInsertSchema = createInsertSchema(post).pick({
  title: true,
  content: true,
  excerpt: true,
  status: true,
  type: true,
  categoryId: true,
  coverId: true,
  commentStatus: true,
  quoteAuthor: true,
  quoteContent: true,
  movieTime: true,
  movieStyleIds: true,
  movieActorIds: true,
  movieDirectorIds: true,
  galleryLocation: true,
  galleryStyleIds: true,
  galleryTime: true,
});
