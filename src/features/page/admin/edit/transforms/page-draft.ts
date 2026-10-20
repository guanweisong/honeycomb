import { z } from "zod";
import { PageInsertSchema } from "@/features/page/schema";

const localizedDraft = z.object({
  zh: z.string().optional(),
  en: z.string().optional(),
});
const PageDraftSchema = PageInsertSchema.omit({ status: true })
  .partial()
  .extend({
    title: localizedDraft.optional(),
    content: localizedDraft.optional(),
  });
export type PageDraft = z.infer<typeof PageDraftSchema>;
export function parsePageDraft(value: unknown): PageDraft | null {
  const result = PageDraftSchema.safeParse(value);
  return result.success ? result.data : null;
}
