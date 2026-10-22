import { z } from "zod";

export const PostSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(100),
  locale: z.enum(["zh", "en"]),
});
