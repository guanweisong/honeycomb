import { z } from "zod";
import {
  PageFieldsSchema,
  PageInsertSchema,
  type PageInsert,
} from "@/features/page/schema";

const localizedDraft = z.object({
  zh: z.string().optional(),
  en: z.string().optional(),
});
export const PageEditorSchema = PageFieldsSchema;
export type PageEditorValues = z.infer<typeof PageEditorSchema>;
const PageDraftSchema = PageFieldsSchema.omit({ status: true })
  .strip()
  .partial()
  .extend({
    baseVersion: z.number().int().nonnegative().optional(),
    title: localizedDraft.optional(),
    content: localizedDraft.optional(),
  });
export type PageDraft = z.infer<typeof PageDraftSchema>;
export function parsePageDraft(value: unknown): PageDraft | null {
  const result = PageDraftSchema.safeParse(value);
  return result.success ? result.data : null;
}

const attemptKey = (userId: string) =>
  `honeycomb:draft:page:${encodeURIComponent(userId)}:creation-attempt`;
export function readPageCreationAttempt(userId: string): PageInsert | null {
  try {
    const raw = window.localStorage.getItem(attemptKey(userId));
    const result = PageInsertSchema.safeParse(raw ? JSON.parse(raw) : null);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
export function writePageCreationAttempt(
  userId: string,
  input: PageInsert,
): boolean {
  try {
    const raw = JSON.stringify(PageInsertSchema.parse(input));
    window.localStorage.setItem(attemptKey(userId), raw);
    return window.localStorage.getItem(attemptKey(userId)) === raw;
  } catch {
    return false;
  }
}
export function clearPageCreationAttempt(userId: string, token: string) {
  try {
    if (readPageCreationAttempt(userId)?.creationToken === token)
      window.localStorage.removeItem(attemptKey(userId));
    return window.localStorage.getItem(attemptKey(userId)) === null;
  } catch {
    return false;
    /* Retain the form when browser storage is unavailable. */
  }
}
export function preservePageDraft(
  userId: string,
  id: string,
  values: PageDraft,
): boolean {
  try {
    const key = `honeycomb:draft:page:${encodeURIComponent(userId)}:${id}`;
    const raw = JSON.stringify({ version: 1, savedAt: Date.now(), values });
    window.localStorage.setItem(key, raw);
    return window.localStorage.getItem(key) === raw;
  } catch {
    return false;
  }
}
